import os
import torch
import argparse
import logging
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

try:
    from trl import SFTTrainer
except ImportError:
    SFTTrainer = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_qlora(args):
    logger.info(f"Starting QLoRA fine-tuning for model '{args.model_name}'...")

    # 1. 4-bit Quantization Config (NF4)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Load Model & Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        quantization_config=bnb_config if torch.cuda.is_available() else None,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True
    )

    if torch.cuda.is_available():
        model = prepare_model_for_kbit_training(model)

    # 3. LoRA Adapter Target Configuration
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )

    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Load Dataset
    dataset = load_dataset("json", data_files=args.dataset_path, split="train")

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        logging_steps=10,
        max_steps=args.max_steps,
        save_strategy="steps",
        save_steps=50,
        fp16=torch.cuda.is_available(),
        optim="paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
        report_to="none"
    )

    if SFTTrainer:
        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset,
            peft_config=peft_config,
            dataset_text_field="messages",
            max_seq_length=1024,
            tokenizer=tokenizer,
            args=training_args,
        )
        logger.info("Executing SFTTrainer training loop...")
        trainer.train()
        trainer.model.save_pretrained(args.output_dir)
        tokenizer.save_pretrained(args.output_dir)
        logger.info(f"LoRA fine-tuned model saved successfully to '{args.output_dir}'.")
    else:
        logger.warning("TRL SFTTrainer not available. PyTorch execution model ready.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QLoRA Multilingual Fine-Tuning")
    parser.add_argument("--model_name", type=str, default="Qwen/Qwen2.5-7B-Instruct")
    parser.add_argument("--dataset_path", type=str, default="./data/processed/multilingual_instructions.jsonl")
    parser.add_argument("--output_dir", type=str, default="./models/qlora_adapter")
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4)
    parser.add_argument("--learning_rate", type=float, default=2e-4)
    parser.add_argument("--max_steps", type=int, default=100)

    args = parser.parse_args()
    train_qlora(args)
