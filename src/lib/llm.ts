import OpenAI from "openai";

/**
 * 可配置的大模型客户端。
 *
 * 通过环境变量自定义，支持任意 OpenAI 兼容接口：
 *   LLM_BASE_URL  接口地址，如 https://api.openai.com/v1 / https://api.deepseek.com/v1 / http://127.0.0.1:8000/v1
 *   LLM_API_KEY   密钥
 *   LLM_MODEL     模型名，如 gpt-4o / deepseek-chat / qwen-max / 本地模型名
 *
 * 切换服务商只需改这三个变量，无需改动任何代码。
 */
export function getLLMConfig() {
  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!baseURL) throw new Error("缺少环境变量 LLM_BASE_URL");
  if (!apiKey) throw new Error("缺少环境变量 LLM_API_KEY");
  if (!model) throw new Error("缺少环境变量 LLM_MODEL");

  return { baseURL, apiKey, model };
}

let _client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (_client) return _client;
  const { baseURL, apiKey } = getLLMConfig();
  _client = new OpenAI({ baseURL, apiKey });
  return _client;
}
