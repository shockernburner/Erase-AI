import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Book,
  Key,
  Upload,
  List,
  Search,
  Webhook,
  Shield,
  AlertTriangle,
  Gauge,
  Building2,
  Crown,
  Settings,
} from "lucide-react";

type SectionId = "overview" | "auth" | "datasets" | "webhooks" | "ratelimits" | "usecases";
type Lang = "curl" | "java" | "python";

interface ApiDocsProps {
  onBack: () => void;
  onUpgrade?: () => void;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const langColors: Record<string, string> = {
    bash: "text-green-400",
    java: "text-orange-300",
    python: "text-blue-300",
    json: "text-yellow-300",
  };
  return (
    <div className="relative group">
      <div className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">{lang}</div>
      <CopyBtn text={code} />
      <pre className={`bg-black/50 rounded-xl p-4 pt-8 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-border/20 ${langColors[lang] || "text-foreground/80"}`}>
        {code}
      </pre>
    </div>
  );
}

function LangTabs({ active, onChange }: { active: Lang; onChange: (l: Lang) => void }) {
  const tabs: { id: Lang; label: string }[] = [
    { id: "curl", label: "cURL / JSON" },
    { id: "java", label: "Java" },
    { id: "python", label: "Python" },
  ];
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active === t.id ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/10 border border-transparent"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/20 text-green-400",
    POST: "bg-blue-500/20 text-blue-400",
    PATCH: "bg-yellow-500/20 text-yellow-400",
    DELETE: "bg-red-500/20 text-red-400",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[method] || "bg-muted text-foreground"}`}>{method}</span>;
}

function EndpointBlock({ method, path, desc, params, response, examples }: {
  method: string;
  path: string;
  desc: string;
  params?: { name: string; type: string; desc: string; required?: boolean }[];
  response: string;
  examples: Record<Lang, string>;
}) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>("curl");
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <MethodBadge method={method} />
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {params && params.length > 0 && (
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("docs.parameters")}</h5>
          <div className="space-y-1">
            {params.map((p) => (
              <div key={p.name} className="flex items-baseline gap-2 text-xs">
                <code className="text-primary font-mono">{p.name}</code>
                <span className="text-muted-foreground/60">{p.type}</span>
                {p.required && <span className="text-red-400 text-[10px]">required</span>}
                <span className="text-muted-foreground">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <LangTabs active={lang} onChange={setLang} />
      <CodeBlock code={examples[lang]} lang={lang === "curl" ? "bash" : lang} />
      <button onClick={() => setShowResponse(!showResponse)} className="text-xs text-primary hover:text-primary/80 transition-colors">
        {showResponse ? t("docs.hideResponse") : t("docs.showResponse")}
      </button>
      {showResponse && <CodeBlock code={response} lang="json" />}
    </div>
  );
}

function FreeUpgradeBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-primary/5 border border-primary/30 rounded-xl p-5 flex items-start gap-4 mb-8">
      <Crown className="w-6 h-6 text-primary shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-bold text-foreground mb-1">{t("docs.upgradeTitle")}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t("docs.upgradeDesc")}</p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("docs.upgradeCta")}
          </button>
        )}
      </div>
    </div>
  );
}

function OverviewSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("docs.overviewTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("docs.overviewDesc")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Upload, title: t("docs.capUpload"), desc: t("docs.capUploadDesc") },
          { icon: Search, title: t("docs.capAnalyze"), desc: t("docs.capAnalyzeDesc") },
          { icon: Webhook, title: t("docs.capWebhook"), desc: t("docs.capWebhookDesc") },
        ].map((c) => (
          <div key={c.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
            <c.icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-primary mb-1">{t("docs.baseUrl")}</h3>
        <code className="text-xs font-mono text-foreground/80">{window.location.origin}/api/v1/</code>
      </div>
    </div>
  );
}

function AuthSection() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>("curl");
  const examples: Record<Lang, string> = {
    curl: `curl -H "Authorization: Bearer eak_your_api_key_here" \\
  ${window.location.origin}/api/v1/datasets`,
    java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class EraseAIAuth {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${window.location.origin}/api/v1/datasets"))
            .header("Authorization", "Bearer eak_your_api_key_here")
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
    python: `import requests

API_KEY = "eak_your_api_key_here"
BASE_URL = "${window.location.origin}/api/v1"

headers = {"Authorization": f"Bearer {API_KEY}"}
response = requests.get(f"{BASE_URL}/datasets", headers=headers)
print(response.json())`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("docs.authTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("docs.authDesc")}</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <span className="text-primary font-bold mt-0.5">1.</span>
          <span className="text-muted-foreground">{t("docs.authStep1")}</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="text-primary font-bold mt-0.5">2.</span>
          <span className="text-muted-foreground">{t("docs.authStep2")}</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <span className="text-primary font-bold mt-0.5">3.</span>
          <span className="text-muted-foreground">{t("docs.authStep3")}</span>
        </div>
      </div>
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/80">{t("docs.authWarning")}</p>
      </div>
      <LangTabs active={lang} onChange={setLang} />
      <CodeBlock code={examples[lang]} lang={lang === "curl" ? "bash" : lang} />
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">{t("docs.keyLimits")}</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-primary font-bold text-lg">5</div>
            <div className="text-muted-foreground">Pro</div>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-violet-400 font-bold text-lg">20</div>
            <div className="text-muted-foreground">Business</div>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-yellow-400 font-bold text-lg">100</div>
            <div className="text-muted-foreground">Enterprise</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatasetsSection() {
  const origin = window.location.origin;
  return (
    <div className="space-y-8">
      <EndpointBlock
        method="POST"
        path="/api/v1/datasets/upload"
        desc="Upload a new dataset file (CSV, JSON, or TXT). The file is parsed and stored as versioned rows."
        params={[
          { name: "file", type: "multipart/form-data", desc: "Dataset file (max 10MB)", required: true },
        ]}
        response={`{
  "dataset_id": 42,
  "name": "training_data.csv",
  "format": "csv",
  "row_count": 1500
}`}
        examples={{
          curl: `curl -X POST ${origin}/api/v1/datasets/upload \\
  -H "Authorization: Bearer eak_your_api_key_here" \\
  -F "file=@training_data.csv"`,
          java: `import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;

public class UploadDataset {
    public static void main(String[] args) throws Exception {
        String apiKey = "eak_your_api_key_here";
        Path filePath = Path.of("training_data.csv");
        String boundary = "----FormBoundary" + System.currentTimeMillis();

        byte[] fileBytes = Files.readAllBytes(filePath);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        String header = "--" + boundary + "\\r\\n"
            + "Content-Disposition: form-data; name=\\"file\\"; "
            + "filename=\\"training_data.csv\\"\\r\\n"
            + "Content-Type: text/csv\\r\\n\\r\\n";
        String footer = "\\r\\n--" + boundary + "--\\r\\n";

        baos.write(header.getBytes());
        baos.write(fileBytes);
        baos.write(footer.getBytes());

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${origin}/api/v1/datasets/upload"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type",
                "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(
                baos.toByteArray()))
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode());
        System.out.println(response.body());
    }
}`,
          python: `import requests

API_KEY = "eak_your_api_key_here"

with open("training_data.csv", "rb") as f:
    response = requests.post(
        "${origin}/api/v1/datasets/upload",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files={"file": ("training_data.csv", f, "text/csv")}
    )
print(response.json())`,
        }}
      />

      <EndpointBlock
        method="GET"
        path="/api/v1/datasets"
        desc="List all datasets owned by the authenticated user, ordered by creation date (newest first)."
        response={`{
  "datasets": [
    {
      "id": 42,
      "name": "training_data.csv",
      "format": "csv",
      "created_at": "2026-04-01T10:30:00.000Z"
    }
  ]
}`}
        examples={{
          curl: `curl ${origin}/api/v1/datasets \\
  -H "Authorization: Bearer eak_your_api_key_here"`,
          java: `import java.net.URI;
import java.net.http.*;

public class ListDatasets {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${origin}/api/v1/datasets"))
            .header("Authorization", "Bearer eak_your_api_key_here")
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          python: `response = requests.get(
    "${origin}/api/v1/datasets",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
for dataset in response.json()["datasets"]:
    print(f"{dataset['id']}: {dataset['name']}")`,
        }}
      />

      <EndpointBlock
        method="POST"
        path="/api/v1/datasets/:id/analyze"
        desc="Run automated analysis on a dataset. Detects PII (emails, phone numbers), toxic content, biased language, and duplicate rows."
        params={[{ name: "id", type: "path param", desc: "Dataset ID", required: true }]}
        response={`{
  "dataset_id": 42,
  "version": 1,
  "total_rows": 1500,
  "active_rows": 1500,
  "issues_count": 12,
  "issues": [
    {
      "issueType": "pii",
      "severity": "high",
      "rowIndex": 7,
      "detail": "Email address detected",
      "suggestedAction": "redact"
    }
  ]
}`}
        examples={{
          curl: `curl -X POST ${origin}/api/v1/datasets/42/analyze \\
  -H "Authorization: Bearer eak_your_api_key_here"`,
          java: `import java.net.URI;
import java.net.http.*;

public class AnalyzeDataset {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${origin}/api/v1/datasets/42/analyze"))
            .header("Authorization", "Bearer eak_your_api_key_here")
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          python: `response = requests.post(
    "${origin}/api/v1/datasets/42/analyze",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
result = response.json()
print(f"Found {result['issues_count']} issues")
for issue in result["issues"]:
    print(f"  [{issue['severity']}] {issue['detail']}")`,
        }}
      />

      <EndpointBlock
        method="GET"
        path="/api/v1/datasets/:id/result"
        desc="Get detailed results for a dataset including version history, row statistics, and operation log."
        params={[{ name: "id", type: "path param", desc: "Dataset ID", required: true }]}
        response={`{
  "dataset": {
    "id": 42,
    "name": "training_data.csv",
    "format": "csv",
    "created_at": "2026-04-01T10:30:00.000Z"
  },
  "versions": [
    { "version_number": 1, "created_at": "2026-04-01T10:30:00.000Z" },
    { "version_number": 2, "created_at": "2026-04-01T11:00:00.000Z" }
  ],
  "current_version": 2,
  "stats": {
    "total_rows": 1500,
    "removed": 5,
    "redacted": 12,
    "active": 1483
  },
  "operations": [
    {
      "type": "delete",
      "value": "john@example.com",
      "affected_rows": 5,
      "created_at": "2026-04-01T11:00:00.000Z"
    }
  ]
}`}
        examples={{
          curl: `curl ${origin}/api/v1/datasets/42/result \\
  -H "Authorization: Bearer eak_your_api_key_here"`,
          java: `import java.net.URI;
import java.net.http.*;

public class GetResult {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${origin}/api/v1/datasets/42/result"))
            .header("Authorization", "Bearer eak_your_api_key_here")
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          python: `response = requests.get(
    "${origin}/api/v1/datasets/42/result",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
result = response.json()
stats = result["stats"]
print(f"Active: {stats['active']}, Removed: {stats['removed']}, Redacted: {stats['redacted']}")`,
        }}
      />

      <EndpointBlock
        method="GET"
        path="/api/v1/datasets/:id/download"
        desc="Download a dataset in its original format. Supports three modes: clean (untouched rows), redacted (includes redacted), and full (all rows with metadata)."
        params={[
          { name: "id", type: "path param", desc: "Dataset ID", required: true },
          { name: "mode", type: "query", desc: "Download mode: clean | redacted | full (default: clean)" },
        ]}
        response={`// Returns file download with Content-Disposition header
// Content-Type matches original format (text/csv, application/json, text/plain)`}
        examples={{
          curl: `# Download clean version
curl -O ${origin}/api/v1/datasets/42/download?mode=clean \\
  -H "Authorization: Bearer eak_your_api_key_here"

# Download with redacted content visible
curl -O ${origin}/api/v1/datasets/42/download?mode=redacted \\
  -H "Authorization: Bearer eak_your_api_key_here"

# Download full dataset with metadata
curl -O ${origin}/api/v1/datasets/42/download?mode=full \\
  -H "Authorization: Bearer eak_your_api_key_here"`,
          java: `import java.net.URI;
import java.net.http.*;
import java.nio.file.Path;

public class DownloadDataset {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(
                "${origin}/api/v1/datasets/42/download?mode=clean"))
            .header("Authorization", "Bearer eak_your_api_key_here")
            .GET()
            .build();

        HttpResponse<Path> response = client.send(request,
            HttpResponse.BodyHandlers.ofFile(
                Path.of("clean_dataset.csv")));
        System.out.println("Downloaded to: " + response.body());
    }
}`,
          python: `response = requests.get(
    "${origin}/api/v1/datasets/42/download",
    headers={"Authorization": f"Bearer {API_KEY}"},
    params={"mode": "clean"}
)
with open("clean_dataset.csv", "wb") as f:
    f.write(response.content)
print("Downloaded clean dataset")`,
        }}
      />
    </div>
  );
}

function WebhooksSection() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>("curl");
  const [setupLang, setSetupLang] = useState<Lang>("curl");
  const origin = window.location.origin;

  const payloadExample = `{
  "event": "dataset.analyzed",
  "datasetId": 42,
  "datasetName": "training_data.csv",
  "status": "completed",
  "summary": {
    "issuesFound": 12,
    "categories": ["pii", "toxic", "duplicate"]
  },
  "timestamp": "2026-04-01T10:30:00.000Z"
}`;

  const receiverExamples: Record<Lang, string> = {
    curl: `# Webhook payload is sent as POST with JSON body
# Headers include:
#   Content-Type: application/json
#   X-Webhook-Event: dataset.analyzed

# Test locally with curl:
curl -X POST https://your-server.com/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Event: dataset.analyzed" \\
  -d '${payloadExample}'`,
    java: `import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.HexFormat;

public class WebhookReceiver {
    static final String WEBHOOK_SECRET = "your_webhook_secret";

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(
            new InetSocketAddress(8080), 0);

        server.createContext("/webhook", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                String event = exchange.getRequestHeaders()
                    .getFirst("X-Webhook-Event");
                String signature = exchange.getRequestHeaders()
                    .getFirst("X-Webhook-Signature");
                byte[] bodyBytes =
                    exchange.getRequestBody().readAllBytes();
                String body = new String(bodyBytes);

                if (!verifySignature(bodyBytes, signature)) {
                    exchange.sendResponseHeaders(401, 0);
                    exchange.close();
                    return;
                }

                System.out.println("Event: " + event);
                System.out.println("Payload: " + body);

                switch (event) {
                    case "dataset.analyzed":
                        System.out.println("Analysis complete");
                        break;
                    case "dataset.erased":
                        System.out.println("Erasure applied");
                        break;
                    case "dataset.failed":
                        System.out.println("Operation failed");
                        break;
                }

                exchange.sendResponseHeaders(200, 0);
                exchange.close();
            }
        });

        server.start();
        System.out.println("Webhook receiver on port 8080");
    }

    static boolean verifySignature(byte[] body, String sig) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                WEBHOOK_SECRET.getBytes(), "HmacSHA256"));
            String expected =
                HexFormat.of().formatHex(mac.doFinal(body));
            return expected.equals(sig);
        } catch (Exception e) {
            return false;
        }
    }
}`,
    python: `import hmac
import hashlib
from flask import Flask, request, jsonify, abort

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload: bytes, signature: str) -> bool:
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")

@app.route("/webhook", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("X-Webhook-Signature", "")
    if not verify_signature(request.data, signature):
        abort(401, "Invalid signature")

    event = request.headers.get("X-Webhook-Event")
    payload = request.json

    print(f"Received event: {event}")
    print(f"Dataset: {payload['datasetName']}")
    print(f"Status: {payload['status']}")

    if event == "dataset.analyzed":
        issues = payload.get("summary", {}).get("issuesFound", 0)
        print(f"Issues found: {issues}")
    elif event == "dataset.erased":
        print("Data erasure completed")
    elif event == "dataset.failed":
        print(f"Operation failed for dataset {payload['datasetId']}")

    return jsonify({"received": True}), 200

if __name__ == "__main__":
    app.run(port=8080)`,
  };

  const setupExamples: Record<Lang, string> = {
    curl: `# Register a webhook (session-authenticated, via Developer Dashboard API)
curl -X POST ${origin}/api/developer/webhooks \\
  -H "Content-Type: application/json" \\
  -b "session_cookie" \\
  -d '{"url": "https://your-server.com/webhook"}'

# Update webhook URL
curl -X PATCH ${origin}/api/developer/webhooks/WEBHOOK_ID \\
  -H "Content-Type: application/json" \\
  -b "session_cookie" \\
  -d '{"url": "https://new-server.com/webhook"}'

# Toggle webhook active/paused
curl -X PATCH ${origin}/api/developer/webhooks/WEBHOOK_ID \\
  -H "Content-Type: application/json" \\
  -b "session_cookie" \\
  -d '{"isActive": false}'

# Send a test webhook
curl -X POST ${origin}/api/developer/webhooks/WEBHOOK_ID/test \\
  -b "session_cookie"

# View delivery history
curl ${origin}/api/developer/webhooks/WEBHOOK_ID/deliveries \\
  -b "session_cookie"

# Delete webhook
curl -X DELETE ${origin}/api/developer/webhooks/WEBHOOK_ID \\
  -b "session_cookie"`,
    java: `import java.net.URI;
import java.net.http.*;
import java.net.CookieManager;

public class WebhookSetup {
    static final String BASE = "${origin}/api/developer";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .cookieHandler(new CookieManager())
            .build();

        // Register webhook
        HttpRequest createReq = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/webhooks"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(
                "{\\"url\\": \\"https://your-server.com/webhook\\"}"))
            .build();
        HttpResponse<String> createRes = client.send(
            createReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Created: " + createRes.body());

        // Send test webhook
        String webhookId = "WEBHOOK_ID";
        HttpRequest testReq = HttpRequest.newBuilder()
            .uri(URI.create(
                BASE + "/webhooks/" + webhookId + "/test"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        HttpResponse<String> testRes = client.send(
            testReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Test result: " + testRes.body());

        // View delivery history
        HttpRequest histReq = HttpRequest.newBuilder()
            .uri(URI.create(
                BASE + "/webhooks/" + webhookId + "/deliveries"))
            .GET()
            .build();
        HttpResponse<String> histRes = client.send(
            histReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Deliveries: " + histRes.body());
    }
}`,
    python: `import requests

session = requests.Session()
BASE = "${origin}/api/developer"

# Register webhook
create_res = session.post(f"{BASE}/webhooks", json={
    "url": "https://your-server.com/webhook"
})
webhook = create_res.json()["webhook"]
webhook_id = webhook["id"]
print(f"Created webhook: {webhook_id}")

# Send test
test_res = session.post(f"{BASE}/webhooks/{webhook_id}/test")
print(f"Test: {test_res.json()}")

# View delivery history
hist_res = session.get(f"{BASE}/webhooks/{webhook_id}/deliveries")
for d in hist_res.json()["deliveries"]:
    status = "OK" if d["success"] else "FAIL"
    print(f"  {d['event']} -> {status} (HTTP {d['responseStatus']})")

# Toggle active/paused
session.patch(f"{BASE}/webhooks/{webhook_id}", json={
    "isActive": False
})
print("Webhook paused")

# Delete webhook
session.delete(f"{BASE}/webhooks/{webhook_id}")
print("Webhook deleted")`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("docs.webhooksTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("docs.webhooksDesc")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("docs.supportedEvents")}</h3>
        {[
          { event: "dataset.analyzed", desc: t("docs.eventAnalyzedDesc") },
          { event: "dataset.erased", desc: t("docs.eventErasedDesc") },
          { event: "dataset.failed", desc: t("docs.eventFailedDesc") },
        ].map((e) => (
          <div key={e.event} className="flex items-center gap-3 px-4 py-3 bg-card/40 border border-border/20 rounded-xl">
            <code className="text-xs font-mono text-primary">{e.event}</code>
            <span className="text-xs text-muted-foreground">{e.desc}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t("docs.payloadStructure")}</h3>
        <CodeBlock code={payloadExample} lang="json" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t("docs.receiverExample")}</h3>
        <LangTabs active={lang} onChange={setLang} />
        <CodeBlock code={receiverExamples[lang]} lang={lang === "curl" ? "bash" : lang} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">{t("docs.signatureTitle")}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t("docs.signatureDesc")}</p>
        <div className="space-y-2">
          {[
            { header: "X-Webhook-Event", desc: t("docs.sigHeaderEvent") },
            { header: "X-Webhook-Signature", desc: t("docs.sigHeaderSig") },
          ].map((h) => (
            <div key={h.header} className="flex items-baseline gap-3 px-4 py-2 bg-card/40 border border-border/20 rounded-lg text-xs">
              <code className="text-primary font-mono font-bold">{h.header}</code>
              <span className="text-muted-foreground">{h.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          {t("docs.webhookSetupTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">{t("docs.webhookSetupDesc")}</p>
        <div className="space-y-2 mb-4">
          {[
            { method: "POST", path: "/api/developer/webhooks", desc: t("docs.whSetupCreate") },
            { method: "PATCH", path: "/api/developer/webhooks/:id", desc: t("docs.whSetupUpdate") },
            { method: "POST", path: "/api/developer/webhooks/:id/test", desc: t("docs.whSetupTest") },
            { method: "GET", path: "/api/developer/webhooks/:id/deliveries", desc: t("docs.whSetupHistory") },
            { method: "DELETE", path: "/api/developer/webhooks/:id", desc: t("docs.whSetupDelete") },
          ].map((ep) => (
            <div key={ep.method + ep.path} className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded-lg border border-border/20">
              <MethodBadge method={ep.method} />
              <code className="text-xs font-mono text-foreground/80 flex-1">{ep.path}</code>
              <span className="text-xs text-muted-foreground hidden sm:inline">{ep.desc}</span>
            </div>
          ))}
        </div>
        <LangTabs active={setupLang} onChange={setSetupLang} />
        <CodeBlock code={setupExamples[setupLang]} lang={setupLang === "curl" ? "bash" : setupLang} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("docs.retryPolicy")}</h3>
        <div className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2 text-sm text-muted-foreground">
          <p>{t("docs.retryDesc")}</p>
          <div className="flex gap-4 text-xs font-mono mt-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">{t("docs.attempt")} 1: 0s</span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">{t("docs.attempt")} 2: 1s</span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">{t("docs.attempt")} 3: 2s</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-300/80 space-y-1">
          <p className="font-bold">{t("docs.securityNote")}</p>
          <p>{t("docs.securityDesc")}</p>
        </div>
      </div>
    </div>
  );
}

function RateLimitsSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("docs.rateLimitsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("docs.rateLimitsDesc")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { plan: "Pro", limit: "1,000", color: "text-primary border-primary/30" },
          { plan: "Business", limit: "10,000", color: "text-violet-400 border-violet-400/30" },
          { plan: "Enterprise", limit: t("docs.unlimitedLabel"), color: "text-yellow-400 border-yellow-400/30" },
        ].map((p) => (
          <div key={p.plan} className={`bg-card/40 border rounded-xl p-4 text-center ${p.color}`}>
            <div className="text-2xl font-bold">{p.limit}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("docs.requestsPerMonth")}</div>
            <div className="text-sm font-semibold mt-2">{p.plan}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t("docs.responseHeaders")}</h3>
        <div className="space-y-2">
          {[
            { header: "X-RateLimit-Limit", desc: t("docs.headerLimit") },
            { header: "X-RateLimit-Remaining", desc: t("docs.headerRemaining") },
            { header: "X-RateLimit-Reset", desc: t("docs.headerReset") },
          ].map((h) => (
            <div key={h.header} className="flex items-baseline gap-3 px-4 py-2 bg-card/40 border border-border/20 rounded-lg text-xs">
              <code className="text-primary font-mono font-bold">{h.header}</code>
              <span className="text-muted-foreground">{h.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t("docs.errorCodes")}</h3>
        <div className="space-y-2">
          {[
            { code: "400", desc: t("docs.err400") },
            { code: "401", desc: t("docs.err401") },
            { code: "403", desc: t("docs.err403") },
            { code: "404", desc: t("docs.err404") },
            { code: "429", desc: t("docs.err429") },
            { code: "500", desc: t("docs.err500") },
          ].map((e) => (
            <div key={e.code} className="flex items-center gap-3 px-4 py-2 bg-card/40 border border-border/20 rounded-lg text-xs">
              <span className={`font-mono font-bold ${parseInt(e.code) >= 500 ? "text-red-400" : parseInt(e.code) >= 400 ? "text-yellow-400" : "text-green-400"}`}>{e.code}</span>
              <span className="text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <CodeBlock
        code={`{
  "error": "Monthly API rate limit exceeded. Your Pro plan allows 1,000 requests/month. Limit resets on 5/1/2026.",
  "limit": 1000,
  "used": 1000,
  "resetDate": "2026-05-01T00:00:00.000Z",
  "upgrade": true
}`}
        lang="json"
      />
    </div>
  );
}

function UseCasesSection() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>("python");

  const cicdExample: Record<Lang, string> = {
    curl: `#!/bin/bash
# CI/CD Pipeline: Upload, analyze, and gate on issues

DATASET="training_data.csv"
API_KEY="eak_your_api_key_here"
BASE="${window.location.origin}/api/v1"

# Step 1: Upload
UPLOAD=$(curl -s -X POST "$BASE/datasets/upload" \\
  -H "Authorization: Bearer $API_KEY" \\
  -F "file=@$DATASET")
DATASET_ID=$(echo $UPLOAD | jq -r '.dataset_id')
echo "Uploaded dataset: $DATASET_ID"

# Step 2: Analyze
ANALYSIS=$(curl -s -X POST "$BASE/datasets/$DATASET_ID/analyze" \\
  -H "Authorization: Bearer $API_KEY")
ISSUES=$(echo $ANALYSIS | jq '.issues_count')
echo "Issues found: $ISSUES"

# Step 3: Gate - fail if high severity issues
HIGH_ISSUES=$(echo $ANALYSIS | jq '[.issues[] | select(.severity=="high")] | length')
if [ "$HIGH_ISSUES" -gt 0 ]; then
  echo "FAIL: $HIGH_ISSUES high-severity issues found"
  exit 1
fi
echo "PASS: No high-severity issues"`,
    java: `import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.io.*;

public class ComplianceScan {
    static final String API_KEY = "eak_your_api_key_here";
    static final String BASE = "${window.location.origin}/api/v1";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        // Step 1: List all datasets
        HttpRequest listReq = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/datasets"))
            .header("Authorization", "Bearer " + API_KEY)
            .GET().build();
        HttpResponse<String> listRes = client.send(listReq,
            HttpResponse.BodyHandlers.ofString());
        System.out.println("Datasets: " + listRes.body());

        // Step 2: Analyze a specific dataset
        HttpRequest analyzeReq = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/datasets/42/analyze"))
            .header("Authorization", "Bearer " + API_KEY)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        HttpResponse<String> analyzeRes = client.send(analyzeReq,
            HttpResponse.BodyHandlers.ofString());
        System.out.println("Analysis: " + analyzeRes.body());

        // Step 3: Download clean dataset
        HttpRequest downloadReq = HttpRequest.newBuilder()
            .uri(URI.create(
                BASE + "/datasets/42/download?mode=clean"))
            .header("Authorization", "Bearer " + API_KEY)
            .GET().build();
        HttpResponse<Path> downloadRes = client.send(downloadReq,
            HttpResponse.BodyHandlers.ofFile(
                Path.of("clean_output.csv")));
        System.out.println("Downloaded: " + downloadRes.body());
    }
}`,
    python: `import requests
import sys

API_KEY = "eak_your_api_key_here"
BASE = "${window.location.origin}/api/v1"
headers = {"Authorization": f"Bearer {API_KEY}"}

def compliance_scan(filepath: str) -> bool:
    """Upload, analyze, and return pass/fail for CI/CD."""

    # Step 1: Upload dataset
    with open(filepath, "rb") as f:
        upload = requests.post(
            f"{BASE}/datasets/upload",
            headers=headers,
            files={"file": (filepath, f)}
        ).json()

    dataset_id = upload["dataset_id"]
    print(f"Uploaded: {upload['name']} ({upload['row_count']} rows)")

    # Step 2: Analyze
    analysis = requests.post(
        f"{BASE}/datasets/{dataset_id}/analyze",
        headers=headers
    ).json()

    print(f"Issues found: {analysis['issues_count']}")

    # Step 3: Check for high-severity issues
    high_issues = [
        i for i in analysis["issues"]
        if i["severity"] == "high"
    ]

    if high_issues:
        print(f"FAIL: {len(high_issues)} high-severity issues")
        for issue in high_issues:
            print(f"  Row {issue['rowIndex']}: {issue['detail']}")
        return False

    # Step 4: Download clean dataset
    clean = requests.get(
        f"{BASE}/datasets/{dataset_id}/download",
        headers=headers,
        params={"mode": "clean"}
    )
    with open(f"clean_{filepath}", "wb") as f:
        f.write(clean.content)
    print("Clean dataset saved")
    return True

if __name__ == "__main__":
    passed = compliance_scan(sys.argv[1])
    sys.exit(0 if passed else 1)`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("docs.useCasesTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("docs.useCasesDesc")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: t("docs.ucCompliance"), desc: t("docs.ucComplianceDesc"), color: "text-green-400" },
          { icon: Gauge, title: t("docs.ucBatch"), desc: t("docs.ucBatchDesc"), color: "text-primary" },
          { icon: Building2, title: t("docs.ucGov"), desc: t("docs.ucGovDesc"), color: "text-yellow-400" },
        ].map((uc) => (
          <div key={uc.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
            <uc.icon className={`w-5 h-5 ${uc.color}`} />
            <h3 className="text-sm font-bold text-foreground">{uc.title}</h3>
            <p className="text-xs text-muted-foreground">{uc.desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t("docs.cicdTitle")}</h3>
        <p className="text-xs text-muted-foreground mb-4">{t("docs.cicdDesc")}</p>
        <LangTabs active={lang} onChange={setLang} />
        <CodeBlock code={cicdExample[lang]} lang={lang === "curl" ? "bash" : lang} />
      </div>
    </div>
  );
}

const SECTIONS: { id: SectionId; icon: typeof Book; labelKey: string }[] = [
  { id: "overview", icon: Book, labelKey: "docs.navOverview" },
  { id: "auth", icon: Key, labelKey: "docs.navAuth" },
  { id: "datasets", icon: List, labelKey: "docs.navDatasets" },
  { id: "webhooks", icon: Webhook, labelKey: "docs.navWebhooks" },
  { id: "ratelimits", icon: Gauge, labelKey: "docs.navRateLimits" },
  { id: "usecases", icon: Building2, labelKey: "docs.navUseCases" },
];

export default function ApiDocs({ onBack, onUpgrade }: ApiDocsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [section, setSection] = useState<SectionId>("overview");
  const showUpgradeBanner = !user;

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
            <ArrowLeft className="w-4 h-4" />
            {t("docs.back")}
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{t("docs.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("docs.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {showUpgradeBanner && <FreeUpgradeBanner onUpgrade={onUpgrade} />}

        <div className="flex gap-8 flex-col md:flex-row">
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-56 shrink-0"
          >
            <div className="md:sticky md:top-8 space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    section === s.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-muted/10 border border-transparent"
                  }`}
                >
                  <s.icon className="w-4 h-4 shrink-0" />
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
          </motion.nav>

          <motion.main
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-w-0"
          >
            {section === "overview" && <OverviewSection />}
            {section === "auth" && <AuthSection />}
            {section === "datasets" && <DatasetsSection />}
            {section === "webhooks" && <WebhooksSection />}
            {section === "ratelimits" && <RateLimitsSection />}
            {section === "usecases" && <UseCasesSection />}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
