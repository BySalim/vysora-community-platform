CREATE TABLE "passage_assistant" (
	"jour" date NOT NULL,
	"assistant" varchar(20) NOT NULL,
	"nature" varchar(20) NOT NULL,
	"chemin" varchar(160) NOT NULL,
	"nombre" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "passage_assistant_jour_assistant_nature_chemin_pk" PRIMARY KEY("jour","assistant","nature","chemin"),
	CONSTRAINT "passage_assistant_assistant_check" CHECK ("passage_assistant"."assistant" in ('CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI', 'COPILOT', 'MISTRAL', 'DEEPSEEK', 'DUCKDUCKGO', 'META', 'AUTRES')),
	CONSTRAINT "passage_assistant_nature_check" CHECK ("passage_assistant"."nature" in ('VISITE', 'LECTURE', 'EXPLORATION', 'ENTRAINEMENT'))
);
