import axios from "axios";
import { getAccessToken } from "./auth/auth";

const BASE_URL = "https://www.yammer.com/api/v1";

// ─── HEADERS ─────────────────────────────────────────────

async function getHeaders() {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── HTML STRIPPING ──────────────────────────────────────

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanMessage(msg: any): any {
  if (!msg) return msg;
  return {
    ...msg,
    body: msg.body
      ? {
          ...msg.body,
          plain: stripHtml(msg.body.plain || msg.body.rich || ""),
          rich: undefined,
        }
      : msg.body,
  };
}

function cleanMessages(data: any): any {
  if (!data) return data;
  if (data.messages) {
    return {
      ...data,
      messages: data.messages.map(cleanMessage),
    };
  }
  if (Array.isArray(data)) {
    return data.map(cleanMessage);
  }
  return data;
}

// ─── COMMUNITY NAME RESOLVER ─────────────────────────────

async function resolveCommunityId(groupIdOrName: string): Promise<string> {
  if (/^\d+$/.test(groupIdOrName)) {
    return groupIdOrName;
  }
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/groups.json`, { headers });
  const groups: any[] = response.data || [];
  const normalized = groupIdOrName.toLowerCase().trim();
  const match = groups.find(
    (g: any) =>
      g.full_name?.toLowerCase() === normalized ||
      g.name?.toLowerCase() === normalized ||
      g.full_name?.toLowerCase().includes(normalized)
  );
  if (!match) {
    throw new Error(
      `Community "${groupIdOrName}" not found. Use get_communities to see available communities.`
    );
  }
  return String(match.id);
}

// ─── NETWORKS ────────────────────────────────────────────

export async function getNetworks() {
  const headers = await getHeaders();
  const response = await axios.get(
    `${BASE_URL}/networks/current.json?list=all`,
    { headers }
  );
  return Array.isArray(response.data) ? response.data : [response.data];
}

// ─── COMMUNITIES / GROUPS ────────────────────────────────

export async function getCommunities() {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/groups.json`, { headers });
  return response.data;
}

export async function getCommunityById(groupId: string) {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/groups/${groupId}.json`, {
    headers,
  });
  return response.data;
}

// ─── MESSAGES / POSTS ────────────────────────────────────

export async function getCommunityMessages(
  groupIdOrName: string,
  page: number = 1
) {
  const groupId = await resolveCommunityId(groupIdOrName);
  const headers = await getHeaders();
  const response = await axios.get(
    `${BASE_URL}/messages/in_group/${groupId}.json`,
    {
      headers,
      params: { page },
    }
  );
  return cleanMessages(response.data);
}

export async function getThread(threadId: string) {
  const headers = await getHeaders();
  const response = await axios.get(
    `${BASE_URL}/messages/in_thread/${threadId}.json`,
    { headers }
  );
  return cleanMessages(response.data);
}

export async function searchMessages(
  query: string,
  fromDate?: string
) {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/search.json`, {
    headers,
    params: {
      search: query,
      model_types: "message",
    },
  });

  const data = cleanMessages(response.data);

  if (fromDate && data?.messages) {
    const cutoff = new Date(fromDate).getTime();
    data.messages = data.messages.filter((msg: any) => {
      const created = new Date(msg.created_at).getTime();
      return created >= cutoff;
    });
  }

  return data;
}

export async function postMessage(groupIdOrName: string, body: string) {
  const groupId = await resolveCommunityId(groupIdOrName);
  const headers = await getHeaders();
  const response = await axios.post(
    `${BASE_URL}/messages.json`,
    { body, group_id: groupId },
    { headers }
  );
  return response.data;
}

export async function replyToMessage(threadId: string, body: string) {
  const headers = await getHeaders();
  const response = await axios.post(
    `${BASE_URL}/messages.json`,
    { body, replied_to_id: threadId },
    { headers }
  );
  return response.data;
}

// ─── RECENT MESSAGES ACROSS COMMUNITIES ──────────────────

export async function getRecentMessages(hoursAgo: number = 24) {
  const headers = await getHeaders();
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const groupsResponse = await axios.get(`${BASE_URL}/groups.json`, {
    headers,
  });
  const groups: any[] = groupsResponse.data || [];

  const results: { community: string; messages: any[] }[] = [];

  for (const group of groups) {
    try {
      const msgResponse = await axios.get(
        `${BASE_URL}/messages/in_group/${group.id}.json`,
        { headers }
      );
      const messages: any[] = msgResponse.data?.messages || [];
      const recent = messages
        .filter((msg: any) => new Date(msg.created_at) >= cutoff)
        .map(cleanMessage);

      if (recent.length > 0) {
        results.push({
          community: group.full_name,
          messages: recent,
        });
      }
    } catch {
      // skip communities we can't access
    }
  }

  return results;
}

// ─── STORYLINE ───────────────────────────────────────────

export async function getStorylineFeed() {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/messages/my_feed.json`, {
    headers,
  });
  return cleanMessages(response.data);
}