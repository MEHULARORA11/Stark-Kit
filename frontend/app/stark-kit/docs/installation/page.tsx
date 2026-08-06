import type { Metadata } from "next";
import {
  DocPage,
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  InlineCode,
  DocCallout,
} from "@/components/doc-primitives";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Installation Guide",
  description: "Install Stark-Kit, configure environment variables for each provider, and set up dotenv.",
};

const INSTALL_CODES: Record<string, string> = {
  bun: "bun add @mehularora/stark-kit zod",
  npm: "npm install @mehularora/stark-kit zod",
  pnpm: "pnpm add @mehularora/stark-kit zod",
  yarn: "yarn add @mehularora/stark-kit zod",
};

const DOTENV_INSTALL = `bun add dotenv`;

const DOTENV_USAGE = `// This MUST be the first import in your entry file
import "dotenv/config";

// Now Stark-Kit can read OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
import { Agent, run, OpenAIProvider } from "@mehularora/stark-kit";`;

const ENV_FILE = `# .env — keep this out of version control
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
MISTRAL_API_KEY=...`;

const CUSTOM_PROVIDER = `import "dotenv/config";
import {
  OpenAIProvider,
  ClaudeProvider,
  GeminiProvider,
  MistralProvider,
} from "@mehularora/stark-kit";

// Each provider reads its key automatically from env vars.
// You can optionally override the key or model:
const openai  = new OpenAIProvider({ model: "gpt-4o-mini" });
const claude  = new ClaudeProvider({ model: "claude-3-haiku-20240307" });
const gemini  = new GeminiProvider({ model: "gemini-1.5-pro" });
const mistral = new MistralProvider({ model: "open-mistral-7b" });`;

const providers = [
  {
    name: "OpenAI",
    adapter: "OpenAIProvider",
    env: "OPENAI_API_KEY",
    import: "{ OpenAIProvider }",
  },
  {
    name: "Anthropic",
    adapter: "ClaudeProvider",
    env: "ANTHROPIC_API_KEY",
    import: "{ ClaudeProvider }",
  },
  {
    name: "Google",
    adapter: "GeminiProvider",
    env: "GEMINI_API_KEY",
    import: "{ GeminiProvider }",
  },
  {
    name: "Mistral",
    adapter: "MistralProvider",
    env: "MISTRAL_API_KEY",
    import: "{ MistralProvider }",
  },
];

export default function InstallationPage() {
  return (
    <DocPage>
      <DocH1>Installation Guide</DocH1>
      <DocLead>
        How to install Stark-Kit and its peer dependencies, configure your environment variables for
        each supported provider, and set up dotenv for local development.
      </DocLead>

      <DocH2>Package Installation</DocH2>
      <DocP>
        Stark-Kit has a single required peer dependency: <InlineCode>zod</InlineCode> for tool
        parameter schemas. Install both together:
      </DocP>

      {Object.entries(INSTALL_CODES).map(([mgr, code]) => (
        <CodeBlock key={mgr} className="mt-3" code={code} language="bash" filename={mgr} />
      ))}

      <DocH2>Loading Environment Variables</DocH2>
      <DocP>
        Stark-Kit reads API keys from <InlineCode>process.env</InlineCode> automatically. For local
        development, use a <InlineCode>.env</InlineCode> file and the{" "}
        <InlineCode>dotenv</InlineCode> package to load it before your code runs.
      </DocP>

      <DocH3>Install dotenv</DocH3>
      <CodeBlock className="mt-3" code={DOTENV_INSTALL} language="bash" />

      <DocH3>Create .env file</DocH3>
      <CodeBlock className="mt-3" code={ENV_FILE} language="bash" filename=".env" />

      <DocCallout type="warning">
        Add <strong>.env</strong> to your <strong>.gitignore</strong>. Never commit API keys to
        version control.
      </DocCallout>

      <DocH3>Import dotenv/config first</DocH3>
      <DocP>
        The <InlineCode>import &quot;dotenv/config&quot;</InlineCode> call must be the <strong>very first
        line</strong> in your entry file — before any Stark-Kit imports — so the environment
        variables are populated before any provider constructor runs.
      </DocP>
      <CodeBlock className="mt-3" code={DOTENV_USAGE} language="typescript" filename="agent.ts" />

      <DocH2>Supported Providers</DocH2>
      <DocP>
        Each provider adapter class reads its own key from a dedicated environment variable. The
        table below lists all four built-in providers:
      </DocP>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provider</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Adapter Class</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Env Variable</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={p.name} className={i < providers.length - 1 ? "border-b border-border" : ""}>
                <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{p.adapter}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.env}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocH2>Specifying the Model</DocH2>
      <DocP>
        All four adapters require a <InlineCode>model</InlineCode> to be specified — there is no
        built-in default. Pass it to the provider constructor, or override it per-agent via{" "}
        <InlineCode>Agent.model</InlineCode>, or per-run by passing it to{" "}
        <InlineCode>run()</InlineCode> or <InlineCode>runStream()</InlineCode>. If no model is
        available at call time, the provider throws an error.
      </DocP>
      <CodeBlock className="mt-4" code={CUSTOM_PROVIDER} language="typescript" filename="providers.ts" />

      <DocH2>TypeScript Setup</DocH2>
      <DocP>
        Stark-Kit ships with full TypeScript types. No <InlineCode>@types/*</InlineCode> package is
        required. Make sure your <InlineCode>tsconfig.json</InlineCode> targets{" "}
        <InlineCode>ES2020</InlineCode> or later and has <InlineCode>"moduleResolution":
        "bundler"</InlineCode> or <InlineCode>"node16"</InlineCode> to resolve the package exports
        correctly.
      </DocP>

      <DocCallout type="tip">
        Using Node.js instead of Bun? Set <InlineCode>"type": "module"</InlineCode> in your{" "}
        <InlineCode>package.json</InlineCode> and use <InlineCode>.mts</InlineCode> extensions or
        explicit ESM imports. Stark-Kit ships as pure ESM.
      </DocCallout>
    </DocPage>
  );
}
