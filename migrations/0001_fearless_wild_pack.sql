ALTER TABLE `prompts` ADD `target_step_order` integer;--> statement-breakpoint
ALTER TABLE `prompts` ADD `exec_type` text DEFAULT 'manual' NOT NULL;