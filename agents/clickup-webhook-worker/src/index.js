/**
 * clickup-webhook-worker — Recebe webhooks do ClickUp e dispara automações.
 *
 * Eventos suportados:
 *   - taskCreated → Verifica se é novo candidato e cria workflow
 *   - taskUpdated → Sincroniza mudanças relevantes
 *   - taskStatusUpdated → Dispara próxima etapa do pipeline
 *
 * Deploy: wrangler deploy
 * Teste: curl -X POST https://your-worker.workers.dev/webhook -d '{"event":"ping"}'
 */

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-ClickUp-Signature",
        },
      });
    }

    // Only accept POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Webhook endpoint
    if (url.pathname === "/webhook") {
      return handleWebhook(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};

// ============================================================================
// Webhook handler
// ============================================================================

async function handleWebhook(request, env, ctx) {
  try {
    // Verify signature if secret is configured
    if (env.CLICKUP_WEBHOOK_SECRET) {
      const signature = request.headers.get("X-ClickUp-Signature");
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response("Unauthorized", { status: 401 });
      }
      // ClickUp uses MD5 of body + secret
      const body = await request.clone().text();
      const expectedSignature = await computeMD5(body + env.CLICKUP_WEBHOOK_SECRET);
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const payload = await request.json();
    const event = payload.event;

    console.log(`Received event: ${event}`);

    // Route to handler
    switch (event) {
      case "taskCreated":
        await handleTaskCreated(payload, env);
        break;
      case "taskUpdated":
        await handleTaskUpdated(payload, env);
        break;
      case "taskStatusUpdated":
        await handleTaskStatusUpdated(payload, env);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true, event }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ============================================================================
// Event handlers
// ============================================================================

async function handleTaskCreated(payload, env) {
  const task = payload.task;
  if (!task) return;

  // Check if this is a new candidate in "Cadastro de Deputados"
  if (task.list?.id === env.CANDIDATES_LIST_ID) {
    console.log(`New candidate task: ${task.name} (${task.id})`);
    // The auto-task-creator.mjs script handles workflow creation
    // This webhook just logs the event for now
  }

  // Check if this is a new content task
  if (task.list?.id === env.CONTENT_LIST_ID) {
    console.log(`New content task: ${task.name} (${task.id})`);
  }
}

async function handleTaskUpdated(payload, env) {
  const task = payload.task;
  if (!task) return;

  console.log(`Task updated: ${task.name} (${task.id})`);

  // Check for relevant custom field changes
  for (const field of task.custom_fields || []) {
    if (field.name === "Status do Site") {
      console.log(`Site status field updated for task ${task.id}`);
    }
  }
}

async function handleTaskStatusUpdated(payload, env) {
  const task = payload.task;
  const status = payload.status;
  if (!task || !status) return;

  console.log(`Task status updated: ${task.name} → ${status.status}`);

  // If a workflow stage is completed, trigger next stage
  if (status.status === "closed" || status.status === "complete") {
    const description = task.description || "";

    // Check for workflow markers
    if (description.includes("stage=lyrics")) {
      console.log("Lyrics approved → Trigger jingle generation");
      // Trigger pipeline-orchestrator with --stage generate_jingle
    } else if (description.includes("stage=jingle")) {
      console.log("Jingle generated → Trigger intro render");
      // Trigger pipeline-orchestrator with --stage render_intro
    } else if (description.includes("stage=intro")) {
      console.log("Intro rendered → Trigger asset sync");
      // Trigger pipeline-orchestrator with --stage sync_assets
    } else if (description.includes("stage=publish")) {
      console.log("Site published → Update status");
      // Trigger pipeline-orchestrator with --stage update_clickup
    }
  }
}

// ============================================================================
// Utility functions
// ============================================================================

async function computeMD5(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
