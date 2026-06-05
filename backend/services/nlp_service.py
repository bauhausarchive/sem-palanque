"""
NLP service for discourse vs. promise comparison.

Uses sentence-transformers with a multilingual or Portuguese-specific model
to compute semantic similarity between campaign promises and parliamentary speeches.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

# Prefer a lightweight multilingual model that supports Portuguese well.
# For higher accuracy, swap to "neuralmind/bert-base-portuguese-cased" with
# a fine-tuned sentence-transformer head, but note it requires ~420 MB.
DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Similarity thresholds
THRESHOLD_CONFIRMACAO = 0.60   # ≥ this → confirmação (promise kept)
THRESHOLD_CONTRADICAO = 0.30   # ≤ this → contradição (promise broken)
# Between the two → neutro / sem evidência clara


@dataclass
class MatchedPair:
    """A single promise–speech match result."""
    promise_text: str
    speech_text: str
    speech_id: int
    speech_date: str
    fase_evento: Optional[str]
    similarity: float
    verdict: str  # confirmacao | contradicao | neutro
    highlighted_excerpt: Optional[str] = None


@dataclass
class PromiseAnalysis:
    """Full analysis result for one promise."""
    promise_text: str
    matched_pairs: List[MatchedPair] = field(default_factory=list)
    overall_score: float = 0.0
    veredicto: str = "sem_evidencia"  # cumprida | contradita | sem_evidencia


class NLPService:
    """Lazy-loaded singleton for sentence similarity computation."""

    _instance: Optional["NLPService"] = None
    _model = None

    def __init__(self, model_name: str = DEFAULT_MODEL) -> None:
        self.model_name = model_name
        self._model = None

    @classmethod
    def get_instance(cls, model_name: str = DEFAULT_MODEL) -> "NLPService":
        if cls._instance is None:
            cls._instance = cls(model_name)
        return cls._instance

    def _load_model(self):
        """Load the sentence-transformer model on first use."""
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading sentence-transformer model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info("Model loaded successfully.")
        except Exception as exc:
            logger.error(f"Failed to load sentence-transformer model: {exc}")
            raise RuntimeError(
                f"Could not load NLP model '{self.model_name}'. "
                "Make sure sentence-transformers is installed and the model is accessible."
            ) from exc

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode a list of texts to embedding vectors (shape [N, dim])."""
        self._load_model()
        return self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity between two normalized vectors."""
        # Since embeddings are already L2-normalized, dot product == cosine sim
        return float(np.dot(a, b))

    def similarity_matrix(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        """Compute pairwise cosine similarities between rows of a and b."""
        return a @ b.T  # shape [len(a), len(b)]

    # -----------------------------------------------------------------------
    # Main analysis method
    # -----------------------------------------------------------------------

    def compare_promises_to_speeches(
        self,
        promises: List[str],
        speeches: List[dict],  # list of {id, sumario, transcricao?, data_hora_inicio, fase_evento?}
        top_k: int = 3,
    ) -> List[PromiseAnalysis]:
        """
        For each promise, find the top-k most similar speeches and determine
        whether the politician has kept, contradicted, or not addressed the promise.

        Args:
            promises: List of campaign promise strings.
            speeches: List of speech dicts with at minimum 'id', 'sumario', 'data_hora_inicio'.
            top_k: How many top matches to return per promise.

        Returns:
            List of PromiseAnalysis objects.
        """
        if not promises or not speeches:
            return []

        self._load_model()

        # Build speech corpus: prefer transcricao if available, else sumario
        speech_texts = [
            (s.get("transcricao") or s.get("sumario", ""))[:2000]  # cap at 2k chars
            for s in speeches
        ]

        # Encode everything
        promise_embeddings = self.encode(promises)       # [P, D]
        speech_embeddings = self.encode(speech_texts)    # [S, D]

        sim_matrix = self.similarity_matrix(promise_embeddings, speech_embeddings)  # [P, S]

        results: List[PromiseAnalysis] = []

        for p_idx, promise_text in enumerate(promises):
            sims = sim_matrix[p_idx]  # shape [S]
            top_indices = np.argsort(sims)[::-1][:top_k]

            matched_pairs: List[MatchedPair] = []
            for s_idx in top_indices:
                sim = float(sims[s_idx])
                if sim < 0.10:
                    # Too low to be relevant at all
                    continue

                speech = speeches[s_idx]
                verdict = self._classify_verdict(sim)
                excerpt = self._extract_relevant_excerpt(
                    promise_text,
                    speech.get("transcricao") or speech.get("sumario", ""),
                )

                matched_pairs.append(
                    MatchedPair(
                        promise_text=promise_text,
                        speech_text=speech.get("sumario", ""),
                        speech_id=speech["id"],
                        speech_date=str(speech.get("data_hora_inicio", "")),
                        fase_evento=speech.get("fase_evento"),
                        similarity=sim,
                        verdict=verdict,
                        highlighted_excerpt=excerpt,
                    )
                )

            overall_score, veredicto = self._aggregate_verdict(matched_pairs)

            results.append(
                PromiseAnalysis(
                    promise_text=promise_text,
                    matched_pairs=matched_pairs,
                    overall_score=overall_score,
                    veredicto=veredicto,
                )
            )

        return results

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _classify_verdict(self, similarity: float) -> str:
        if similarity >= THRESHOLD_CONFIRMACAO:
            return "confirmacao"
        if similarity <= THRESHOLD_CONTRADICAO:
            return "contradicao"
        return "neutro"

    def _aggregate_verdict(
        self, pairs: List[MatchedPair]
    ) -> Tuple[float, str]:
        """Aggregate per-pair results into an overall score and veredicto."""
        if not pairs:
            return 0.0, "sem_evidencia"

        best_sim = max(p.similarity for p in pairs)
        has_confirmacao = any(p.verdict == "confirmacao" for p in pairs)
        has_contradicao = any(p.verdict == "contradicao" for p in pairs)

        if has_confirmacao and not has_contradicao:
            return best_sim, "cumprida"
        if has_contradicao and not has_confirmacao:
            return best_sim, "contradita"
        if has_confirmacao and has_contradicao:
            # Mixed signals — use the dominant one by similarity
            best_conf = max(
                (p.similarity for p in pairs if p.verdict == "confirmacao"),
                default=0.0,
            )
            best_cont = max(
                (p.similarity for p in pairs if p.verdict == "contradicao"),
                default=0.0,
            )
            if best_conf >= best_cont:
                return best_conf, "cumprida"
            return best_cont, "contradita"

        return best_sim, "sem_evidencia"

    def _extract_relevant_excerpt(
        self,
        promise: str,
        speech_text: str,
        max_len: int = 300,
    ) -> Optional[str]:
        """
        Find the sentence in speech_text most similar to the promise.
        Returns a short excerpt around the best matching sentence.
        """
        if not speech_text or len(speech_text) < 20:
            return None

        # Split into sentences (simple heuristic for Portuguese)
        sentences = re.split(r"(?<=[.!?])\s+", speech_text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        if not sentences:
            return speech_text[:max_len]

        # Encode promise + sentences
        try:
            all_texts = [promise] + sentences
            embeddings = self.encode(all_texts)
            p_emb = embeddings[0]
            s_embs = embeddings[1:]
            sims = s_embs @ p_emb
            best_idx = int(np.argmax(sims))
            best_sentence = sentences[best_idx]
            # Return up to max_len chars
            return best_sentence[:max_len]
        except Exception:
            return speech_text[:max_len]


# ── Module-level convenience functions ───────────────────────────────────────

def get_nlp_service() -> NLPService:
    """FastAPI dependency: returns the singleton NLPService."""
    return NLPService.get_instance()
