import type { Metadata } from "next";
import {
  DocPage,
  DocH1,
  DocH2,
  DocLead,
  DocP,
  InlineCode,
  DocCallout,
} from "@/components/doc-primitives";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Providers",
  description:
    "How Stark-Kit abstracts LLM APIs and how to build your own custom Provider.",
};

const PROVIDERS_CODE = `import { OpenAIProvider, ClaudeProvider, GeminiProvider, MistralProvider } from "@mehularora/stark-kit";

// OpenAI (uses OPENAI_API_KEY)
const openAI = new OpenAIProvider({ model: "gpt-4o" });

// Anthropic Claude (uses ANTHROPIC_API_KEY)
const claude = new ClaudeProvider({ model: "claude-3-5-sonnet-20240620" });

// Google Gemini (uses GEMINI_API_KEY)
const gemini = new GeminiProvider({ model: "gemini-1.5-pro" });

// Mistral (uses MISTRAL_API_KEY)
const mistral = new MistralProvider({ model: "mistral-large-latest" });`;

const CUSTOM_PROVIDER_CODE = `import { Provider, ChatOptions, AIResponse, CanonicalMessage } from "@mehularora/stark-kit";

export class CustomProvider implements Provider {
  name = "CustomProvider";

  async chat(messages: CanonicalMessage[], options: ChatOptions): Promise<AIResponse> {
    // 1. Map CanonicalMessage[] to your LLM's expected format
    const mappedMessages = this.mapMessages(messages);

    // 2. Call your LLM API
    const response = await fetch("https://api.your-llm.com/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: mappedMessages, ...options })
    }).then(res => res.json());

    // 3. Map the response back to AIResponse format
    return {
      message: {
        role: "assistant",
        content: response.text,
      },
      toolCalls: response.tools?.map(t => ({
        id: t.id,
        name: t.name,
        args: JSON.parse(t.arguments)
      }))
    };
  }

  async *stream(messages: CanonicalMessage[], options: ChatOptions) {
    // Similar to chat(), but yield StreamChunk objects
    // ...
  }
}`;

export default function ProvidersPage() {
  return (
    <DocPage>
      <DocH1>Providers</DocH1>
      <DocLead>
        Stark-Kit is provider-agnostic. Agents communicate using a unified <InlineCode>CanonicalMessage</InlineCode> format, allowing you to seamlessly swap between models.
      </DocLead>

      <DocH2>Built-in Providers</DocH2>
      <DocP>
        Stark-Kit includes built-in adapters for four major AI platforms. Each provider handles the translation between Stark-Kit's unified format and the underlying vendor API.
      </DocP>
      <CodeBlock className="mt-4" code={PROVIDERS_CODE} language="typescript" filename="providers.ts" />

      <DocCallout type="tip">
        You can pass specific <InlineCode>model</InlineCode> variants directly into the provider constructor, or override them per-agent inside the <InlineCode>Agent</InlineCode> config.
      </DocCallout>

      <DocH2>Custom Providers</DocH2>
      <DocP>
        If you need to connect to an open-source model, a local LLM via Ollama, or an enterprise gateway, you can implement the <InlineCode>Provider</InlineCode> interface yourself.
      </DocP>
      <DocP>
        A Provider requires only two methods: <InlineCode>chat()</InlineCode> and <InlineCode>stream()</InlineCode>. Both receive an array of <InlineCode>CanonicalMessage</InlineCode> and options (like tools, temperature, max tokens), and must return a standardized response.
      </DocP>
      <CodeBlock className="mt-4" code={CUSTOM_PROVIDER_CODE} language="typescript" filename="custom-provider.ts" />
    </DocPage>
  );
}
