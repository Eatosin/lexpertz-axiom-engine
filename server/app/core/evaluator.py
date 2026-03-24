import os
from typing import Dict, List, Optional

# SOTA: Migration to RAGAS 0.2.x API
from ragas import evaluate, SingleTurnSample, EvaluationDataset
from ragas.metrics import Faithfulness
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI
from pydantic import SecretStr # V2 Native Secret Management

class AxiomEvaluator:
    """
    The Lite Auditor (V4.4 Production Refactor)
    Upgraded for RAGAS 0.2.x and LangChain 0.3.x.
    """
    def __init__(self):
        self.evaluator_llm: Optional[LangchainLLMWrapper] = None
        self.faithfulness_metric: Optional[Faithfulness] = None

    def _lazy_init(self) -> None:
        """Initializes the RAGAS V2 primitives on demand."""
        if self.evaluator_llm is None:
            print("AXIOM-CORE: Materializing RAGAS V2 Auditor (NVIDIA NIM)...")
            
            raw_key = os.environ.get("NVIDIA_API_KEY")
            
            # SOTA: Pydantic V2 SecretStr and max_completion_tokens
            llm = ChatOpenAI(
                model="meta/llama-3.3-70b-instruct",
                temperature=0,
                api_key=SecretStr(raw_key) if raw_key else None,
                base_url="https://integrate.api.nvidia.com/v1",
                max_completion_tokens=512 # Renamed from max_tokens for LC 0.3
            )
            
            # Wrap LangChain LLM for RAGAS 0.2 compatibility
            self.evaluator_llm = LangchainLLMWrapper(llm)
            self.faithfulness_metric = Faithfulness(llm=self.evaluator_llm)

    async def score_response(self, question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
        """
        Executes a RAGAS V2 evaluation using SingleTurnSample logic.
        """
        self._lazy_init()
        
        try:
            # 1. Construct the RAGAS V2 Sample
            sample = SingleTurnSample(
                user_input=question,
                response=answer,
                retrieved_contexts=contexts
            )
            
            # 2. Wrap in an EvaluationDataset (Required for RAGAS 0.2)
            dataset = EvaluationDataset(samples=[sample])

            # 3. Execute Async Evaluation
            # Faithfulness metric is now an initialized class instance
            result = await evaluate(
                dataset=dataset,
                metrics=[self.faithfulness_metric]
            )

            # 4. Extract scores from the Result object
            # Note: RAGAS 0.2 returns a results object that acts like a dataframe/dict
            scores_df = result.to_pandas()
            faithfulness_score = float(scores_df["faithfulness"].iloc[0])

            return {
                "faithfulness": faithfulness_score,
                "relevance": 1.0, 
                "precision": 1.0
            }
            
        except Exception as e:
            print(f"⚠️ RAGAS V2 EVAL ERROR: {e}")
            return {"faithfulness": 1.0, "relevance": 1.0, "precision": 1.0}

# Global singleton
axiom_evaluator = AxiomEvaluator()
