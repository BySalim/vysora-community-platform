CREATE TABLE "guide_contenu_retire" (
	"guide_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_contenu_retire_guide_id_contenu_id_pk" PRIMARY KEY("guide_id","contenu_id")
);
--> statement-breakpoint
ALTER TABLE "guide_contenu_retire" ADD CONSTRAINT "guide_contenu_retire_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_contenu_retire" ADD CONSTRAINT "guide_contenu_retire_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;