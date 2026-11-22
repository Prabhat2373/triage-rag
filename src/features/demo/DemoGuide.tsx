const steps = [
  ['Find the relevant records', 'The app receives your question and searches its knowledge base for matching symptoms, service names, and error codes. In a signed-in workspace, it scopes the search to your workspace.'],
  ['Build the model request', 'The app prepares a prompt containing your question, relevant follow-up context when needed, and a small set of matching incident excerpts. An excerpt can include the incident ID, title, symptoms, and fix.'],
  ['Generate an answer', 'The configured model reads that prompt and writes a response. TriageRAG asks it to cite the incident IDs. Open a citation to see the record behind the answer.'],
];

const dataPaths = [
  ['Public demo', 'The app searches bundled fictional records and uses Gemini to generate each reply. The knowledge base and guide can still be browsed when chat is unavailable.'],
  ['Gemini chat', 'TriageRAG sends the redacted question, relevant follow-up context, and matching records to the Gemini API. Google handles the request under the applicable API terms.'],
  ['Local Ollama in a regular workspace', 'The app sends the question and matching records to the configured Ollama runtime. When Ollama is self-hosted, model processing happens on that host.'],
  ['Optional Gemini semantic search in a regular workspace', 'If a workspace enables Gemini semantic indexing, TriageRAG sends redacted questions and incident text to Google’s embedding API. It stores the incident vectors in PostgreSQL. Otherwise, Gemini chat searches incident text in PostgreSQL.'],
];

const problems = [
  ['The search can miss the right incident', 'A vague question or an unfamiliar service nickname can produce weak matches. Include the service, error code, and what changed before the problem started.'],
  ['A close match can point to the wrong fix', 'Two HTTP 504 errors can have different causes. Check the cited symptoms and verification steps against your current incident before applying the fix.'],
  ['The model can get details wrong', 'A model may misread a record, overstate what it proves, or attach a citation that fails to support a claim. Use citations to verify the answer against the original text.'],
  ['Old or incomplete records weaken answers', 'Search can only use the information it has. Update outdated resolutions and record how the fix was verified. An empty result can also mean the issue has never been documented.'],
];

export function DemoGuide({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <article className="min-h-0 flex-1 overflow-y-auto" aria-labelledby="demo-guide-title">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 text-sm leading-6 sm:px-8 sm:py-12">
        <header>
          <h1 id="demo-guide-title" className="text-3xl font-semibold tracking-tight">How RAG works</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            RAG stands for retrieval-augmented generation. It gives an AI model relevant information to read before it answers a question. Think of it as an open-book test where the app finds the right pages first.
          </p>
        </header>

        <section aria-labelledby="why-rag-title">
          <h2 id="why-rag-title" className="text-xl font-semibold">Why use RAG in the first place?</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A general-purpose AI model can explain what an HTTP 504 means. To tell you how your team fixed last week’s invoice outage, it needs the incident record. That information may be private, recent, or spread across tickets and internal documents.
          </p>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            RAG searches those records when you ask a question and gives the model a few relevant excerpts. Your team can update a resolution in the knowledge base without retraining the model. You spend less time opening old tickets, and the citations let you check which fix actually worked before trying it again.
          </p>
        </section>

        <section aria-labelledby="example-title" className="rounded-2xl border border-violet-200 bg-violet-500/5 p-5 dark:border-violet-400/25">
          <h2 id="example-title" className="text-lg font-semibold">Try it with an incident</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Ask “Why did large invoice exports time out?” TriageRAG finds the incident about exports returning HTTP 504. The record explains that the team moved large exports to a background job and verified that downloads completed.
          </p>
          <button type="button" onClick={onOpenChat} className="mt-4 min-h-10 rounded-xl bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">Open chat</button>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-xl font-semibold">From question to answer</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-slate-600 dark:text-slate-300">
            {steps.map(([title, description]) => (
              <li key={title}><strong className="text-slate-950 dark:text-white">{title}.</strong> {description}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="vector-title">
          <h2 id="vector-title" className="text-xl font-semibold">How a vector database finds similar incidents</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A vector is a list of numbers. An embedding model turns text into one of these lists so that passages with similar meanings often end up close together. For example, “customers keep getting logged out” can be close to “users were signed out when they opened a second tab,” even though the wording differs.
          </p>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-slate-600 dark:text-slate-300">
            <li><strong className="text-slate-950 dark:text-white">Store the incident.</strong> The app turns incident text into a vector and stores it with a reference to the original record.</li>
            <li><strong className="text-slate-950 dark:text-white">Search for nearby vectors.</strong> The app turns your question into a vector using the same embedding model. It compares that vector with stored incident vectors and ranks the closest matches.</li>
            <li><strong className="text-slate-950 dark:text-white">Read the original text.</strong> The app retrieves the matching incident excerpts. The chat model writes its answer using those excerpts as context.</li>
          </ol>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            A close match is a lead to investigate. Two incidents can sound alike and still have different causes. Text search is useful for exact terms like error codes and ticket IDs. A RAG app can retrieve records using text search, vector search, or both.
          </p>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            The public demo searches bundled sample records by text. Regular workspaces can store and search vectors in PostgreSQL with its pgvector extension.
          </p>
        </section>

        <section aria-labelledby="access-title">
          <h2 id="access-title" className="text-xl font-semibold">How an AI model gets access to your data</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            TriageRAG acts as the intermediary. The app holds the database connection, checks access, and selects what to send. The chat model sees the content included in its request. TriageRAG gives it no database credentials or tools to browse GitHub, run SQL, or change records. Other AI apps can grant models tools, so the permissions depend on how each app is built.
          </p>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            This is called adding <strong className="text-slate-950 dark:text-white">context</strong>. It happens when you ask a question and requires no model retraining. A hosted model still receives a copy of the content in that request.
          </p>
          <dl className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
            {dataPaths.map(([name, description]) => (
              <div key={name} className="px-4 py-3">
                <dt className="font-semibold">{name}</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="security-title">
          <h2 id="security-title" className="text-xl font-semibold">Security and privacy</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-slate-600 dark:text-slate-300">
            <li><strong className="text-slate-950 dark:text-white">Access is checked by the app.</strong> In a regular workspace, the server checks your session and limits incident searches to your workspace. Imported records become part of that workspace’s knowledge base, so only import material its members may read. The demo is public and uses a separate collection of fictional incidents.</li>
            <li><strong className="text-slate-950 dark:text-white">Redaction catches common patterns.</strong> TriageRAG masks patterns such as email addresses, some API keys, and passwords inside supported database URLs. It can miss unusual credentials, customer names, or sensitive business details written in ordinary text. Leave secrets and sensitive customer data out of questions and records.</li>
            <li><strong className="text-slate-950 dark:text-white">Imported text can contain misleading instructions.</strong> A ticket or comment can try to redirect the model away from the user’s question. TriageRAG checks for some suspicious phrases in questions and instructs the model to treat records as reference material. These checks can miss attempts, so use trusted sources and review unexpected answers. <a href="https://genai.owasp.org/llmrisk/llm01-prompt-injection/" className="font-medium text-violet-700 underline dark:text-violet-300">OWASP guide to prompt injection</a></li>
            <li><strong className="text-slate-950 dark:text-white">Cloud data handling depends on the provider.</strong> Before sending company records to Gemini, check the terms for your service tier and region, including retention and whether requests can be used to improve services. <a href="https://ai.google.dev/gemini-api/terms" className="font-medium text-violet-700 underline dark:text-violet-300">Gemini API terms</a></li>
          </ul>
        </section>

        <section aria-labelledby="sources-title">
          <h2 id="sources-title" className="text-xl font-semibold">Where the knowledge comes from</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">This public demo uses fictional incidents. In a regular workspace, your team can add resolved incidents, import an Excel file, or bring in closed GitHub issues that describe a fix. Future questions can use those records as soon as they’re available to search.</p>
        </section>

        <section aria-labelledby="uses-title">
          <h2 id="uses-title" className="text-xl font-semibold">Where it helps</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
            <li><strong className="text-slate-950 dark:text-white">Incident response.</strong> Find a past outage with similar symptoms and see which fix worked.</li>
            <li><strong className="text-slate-950 dark:text-white">Customer support.</strong> Draft replies using approved help articles and resolved tickets.</li>
            <li><strong className="text-slate-950 dark:text-white">Onboarding and internal help.</strong> Answer questions from policies, runbooks, or product documentation and point people to the source.</li>
          </ul>
        </section>

        <section aria-labelledby="limits-title">
          <h2 id="limits-title" className="text-xl font-semibold">Where answers can go wrong</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-slate-600 dark:text-slate-300">
            {problems.map(([title, description]) => (
              <li key={title}><strong className="text-slate-950 dark:text-white">{title}.</strong> {description}</li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
