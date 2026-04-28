import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getNetworks,
  getCommunities,
  getCommunityById,
  getCommunityMessages,
  getThread,
  searchMessages,
  postMessage,
  replyToMessage,
  getStorylineFeed,
  getRecentMessages,
} from "./yammerClient";

const server = new McpServer({
  name: "mcp-viva-engage",
  version: "1.1.0",
});

// ─── NETWORKS ────────────────────────────────────────────

server.registerTool(
  "get_networks",
  {
    title: "Get Networks",
    description: "Get all Viva Engage networks the user belongs to",
  },
  async () => {
    const data = await getNetworks();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─── COMMUNITIES ─────────────────────────────────────────

server.registerTool(
  "get_communities",
  {
    title: "Get Communities",
    description:
      "Get all Viva Engage communities/groups the user is a member of in their home network",
  },
  async () => {
    const data = await getCommunities();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "get_community_by_id",
  {
    title: "Get Community By ID",
    description: "Get details of a specific Viva Engage community by its ID",
    inputSchema: {
      group_id: z.string().describe("The ID of the community/group"),
    },
  },
  async ({ group_id }) => {
    const data = await getCommunityById(group_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─── MESSAGES ────────────────────────────────────────────

server.registerTool(
  "get_community_messages",
  {
    title: "Get Community Messages",
    description:
      "Get messages/posts in a specific Viva Engage community. Accepts community name (e.g. 'Developers') or numeric ID. Optionally paginate with page number.",
    inputSchema: {
      group_id_or_name: z
        .string()
        .describe("The ID or name of the community/group"),
      page: z
        .number()
        .optional()
        .describe("Page number for pagination (default: 1)"),
    },
  },
  async ({ group_id_or_name, page }) => {
    const data = await getCommunityMessages(group_id_or_name, page ?? 1);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "get_thread",
  {
    title: "Get Thread",
    description: "Get all messages in a specific conversation thread",
    inputSchema: {
      thread_id: z.string().describe("The ID of the thread to retrieve"),
    },
  },
  async ({ thread_id }) => {
    const data = await getThread(thread_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "search_messages",
  {
    title: "Search Messages",
    description:
      "Search for posts and messages across all communities. Optionally filter by date to find recent posts (e.g. this week, today).",
    inputSchema: {
      query: z.string().describe("The search term or topic to search for"),
      from_date: z
        .string()
        .optional()
        .describe(
          "Optional start date filter in ISO format (e.g. '2026-04-21' for this week). Only return messages after this date."
        ),
    },
  },
  async ({ query, from_date }) => {
    const data = await searchMessages(query, from_date);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "post_message",
  {
    title: "Post Message",
    description:
      "Post a new message to a Viva Engage community. Accepts community name (e.g. 'Developers') or numeric ID.",
    inputSchema: {
      group_id_or_name: z
        .string()
        .describe("The ID or name of the community to post to"),
      body: z.string().describe("The content of the message to post"),
    },
  },
  async ({ group_id_or_name, body }) => {
    const data = await postMessage(group_id_or_name, body);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "reply_to_message",
  {
    title: "Reply To Message",
    description: "Reply to an existing message or conversation thread",
    inputSchema: {
      thread_id: z
        .string()
        .describe("The ID of the message or thread to reply to"),
      body: z.string().describe("The content of the reply"),
    },
  },
  async ({ thread_id, body }) => {
    const data = await replyToMessage(thread_id, body);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─── RECENT MESSAGES ─────────────────────────────────────

server.registerTool(
  "get_recent_messages",
  {
    title: "Get Recent Messages",
    description:
      "Get recent messages across ALL communities. Use this to summarize what's new today or this week. Returns only communities that have new activity.",
    inputSchema: {
      hours_ago: z
        .number()
        .optional()
        .describe(
          "How many hours back to look for messages (default: 24 for today, use 168 for this week)"
        ),
    },
  },
  async ({ hours_ago }) => {
    const data = await getRecentMessages(hours_ago ?? 24);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─── STORYLINE ───────────────────────────────────────────

server.registerTool(
  "get_storyline_feed",
  {
    title: "Get Storyline Feed",
    description: "Get the current user's Viva Engage storyline/personal feed",
  },
  async () => {
    const data = await getStorylineFeed();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─── START SERVER ────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});