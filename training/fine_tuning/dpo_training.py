import argparse
import logging
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments

try:
    from trl import DPOTrainer
except ImportError:
    DPOTrainer = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_dpo_training(args):
    logger.info(f"Starting DPO Alignment training from feedback dataset '{args.feedback_dataset}'...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        device_map="auto",
        trust_remote_code=True
    )

    if DPOTrainer:
        dataset = load_dataset("json", data_files=args.feedback_dataset, split="train")
        training_args = TrainingArguments(
            output_dir=args.output_dir,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,
            learning_rate=5e-7,
            max_steps=50,
            logging_steps=10,
        )
        dpo_trainer = DPOTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=tokenizer,
            beta=0.1,
            max_prompt_length=512,
            max_length=1024,
        )
        dpo_trainer.train()
        dpo_trainer.save_model(args.output_dir)
        logger.info(f"DPO alignment model saved to '{args.output_dir}'.")
    else:
        logger.warning("TRL DPOTrainer module not loaded. DPO pipeline ready.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DPO Alignment Fine-Tuning")
    parser.add_argument("--model_name", type=str, default="./models/qlora_adapter")
    parser.add_argument("--feedback_dataset", type=str, default="./data/processed/dpo_pairs.jsonl")
    parser.add_argument("--output_dir", type=str, default="./models/dpo_aligned_model")

    args = parser.parse_args()
    run_dpo_training(args)
