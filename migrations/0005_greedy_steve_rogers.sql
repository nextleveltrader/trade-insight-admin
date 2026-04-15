PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_saved_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`post_id` text NOT NULL,
	`saved_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_saved_posts`("id", "user_id", "post_id", "saved_at") SELECT "id", "user_id", "post_id", "saved_at" FROM `saved_posts`;--> statement-breakpoint
DROP TABLE `saved_posts`;--> statement-breakpoint
ALTER TABLE `__new_saved_posts` RENAME TO `saved_posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_save_idx` ON `saved_posts` (`user_id`,`post_id`);--> statement-breakpoint
ALTER TABLE `assets` ADD `category` text;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`asset_id` integer,
	`category` text,
	`tags` text,
	`slug` text,
	`meta_description` text,
	`meta_keywords` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`published_at` text,
	`direction` text,
	`bias_type` text,
	`summary` text,
	`body` text,
	`is_pro_only` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "direction_check" CHECK("__new_posts"."direction" in ('Bullish', 'Bearish', 'Neutral'))
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "title", "content", "status", "asset_id", "category", "tags", "slug", "meta_description", "meta_keywords", "created_at", "published_at", "direction", "bias_type", "summary", "body", "is_pro_only", "confidence") SELECT "id", "title", "content", "status", "asset_id", "category", "tags", "slug", "meta_description", "meta_keywords", "created_at", "published_at", "direction", "bias_type", "summary", "body", "is_pro_only", "confidence" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;