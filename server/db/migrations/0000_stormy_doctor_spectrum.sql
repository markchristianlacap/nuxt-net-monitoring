CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"admin_user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_singleton_check" CHECK ("app_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "bandwidths" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" varchar(255) NOT NULL,
	"displayName" varchar(255),
	"interface" varchar(255) DEFAULT '' NOT NULL,
	"inMbps" double precision NOT NULL,
	"outMbps" double precision NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pings" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" varchar(255) NOT NULL,
	"status" varchar(10) NOT NULL,
	"latency" double precision,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speedtest_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"download" integer NOT NULL,
	"upload" integer NOT NULL,
	"latency" numeric NOT NULL,
	"isp" varchar(255) NOT NULL,
	"ip" varchar(45) NOT NULL,
	"network_interface" varchar(255),
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;