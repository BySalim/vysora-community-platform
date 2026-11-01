CREATE TABLE "illustration_savoir" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "illustration_savoir_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"savoir" varchar(80) NOT NULL,
	"creation_id" bigint NOT NULL,
	"moment_cle_id" bigint,
	"note" varchar(300),
	"ordre" smallint NOT NULL,
	"date_ajout" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sujet_savoir" (
	"savoir" varchar(80) PRIMARY KEY NOT NULL,
	"sujet_id" bigint NOT NULL,
	"date_ajout" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "illustration_savoir" ADD CONSTRAINT "illustration_savoir_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "illustration_savoir" ADD CONSTRAINT "illustration_savoir_moment_cle_id_moment_cle_id_fk" FOREIGN KEY ("moment_cle_id") REFERENCES "public"."moment_cle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet_savoir" ADD CONSTRAINT "sujet_savoir_sujet_id_sujet_id_fk" FOREIGN KEY ("sujet_id") REFERENCES "public"."sujet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "illustration_savoir_savoir_idx" ON "illustration_savoir" USING btree ("savoir","ordre");--> statement-breakpoint
CREATE INDEX "illustration_savoir_creation_idx" ON "illustration_savoir" USING btree ("creation_id");