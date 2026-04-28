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

export async function getCommunityMessages(groupId: string) {
  const headers = await getHeaders();
  const response = await axios.get(
    `${BASE_URL}/messages/in_group/${groupId}.json`,
    { headers }
  );
  return response.data;
}

export async function getThread(threadId: string) {
  const headers = await getHeaders();
  const response = await axios.get(
    `${BASE_URL}/messages/in_thread/${threadId}.json`,
    { headers }
  );
  return response.data;
}

export async function searchMessages(query: string) {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/search.json`, {
    headers,
    params: {
      search: query,
      model_types: "message",
    },
  });
  return response.data;
}

export async function postMessage(groupId: string, body: string) {
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

// ─── STORYLINE ───────────────────────────────────────────

export async function getStorylineFeed() {
  const headers = await getHeaders();
  const response = await axios.get(`${BASE_URL}/messages/my_feed.json`, {
    headers,
  });
  return response.data;
}