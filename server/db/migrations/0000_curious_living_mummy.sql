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
	"url" text NOT NULL
);
