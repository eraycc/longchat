// bun runtime

// 环境变量配置
const API_BASEURL = process.env.API_BASEURL || "https://longcat.chat";
const AUTH_COOKIES = process.env.AUTH_COOKIES || "Ag1,Ag2,Ag3…，可以通过AUTH_COOKIES环境变量设置，支持多个账户cookie使用英文逗号分隔，不推荐大量白嫖，有被ban的风险";

// 调试：输出环境变量
console.log('=== 环境变量调试 ===');
console.log('API_BASEURL:', API_BASEURL);
console.log('AUTH_COOKIES length:', AUTH_COOKIES.length);
console.log('AUTH_COOKIES preview:', AUTH_COOKIES.substring(0, 50) + '...');
console.log('process.env.AUTH_COOKIES:', process.env.AUTH_COOKIES || 'undefined');
console.log('process.env.API_BASEURL:', process.env.API_BASEURL || 'undefined');
console.log('===================');

// 浏览器 UA 列表
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

// Cookie 轮询管理
interface CookieInfo {
  cookie: string;
  successCount: number;
  failureCount: number;
  requestCount: number;
  rotationFailures: number; // 轮询失败计数
  lastUsed: number;
  permanentlyDisabled: boolean; // 永久禁用
  disabledAt: number;
}

class CookieRoundRobin {
  private cookies: CookieInfo[] = [];
  private currentIndex = 0;
  private requestsPerCookie = 3; // 每个 Cookie 请求 3 次
  private currentCookieRequests = 0;
  private maxRotationFailures = 5; // 轮询失败5次永久禁用

  constructor(cookies: string[]) {
    this.initializeCookies(cookies);
  }

  private initializeCookies(cookies: string[]) {
    this.cookies = cookies.map(cookie => ({
      cookie,
      successCount: 0,
      failureCount: 0,
      requestCount: 0,
      rotationFailures: 0,
      lastUsed: 0,
      permanentlyDisabled: false,
      disabledAt: 0
    }));
  }

  // 获取下一个 Cookie（轮询）
  getNextCookie(): string | null {
    if (this.cookies.length === 0) {
      return null;
    }

    // 找到下一个可用的 Cookie
    let attempts = 0;
    while (attempts < this.cookies.length) {
      const cookie = this.cookies[this.currentIndex];
      
      // 检查 Cookie 是否被永久禁用
      if (cookie.permanentlyDisabled) {
        console.log(`[DEBUG] Cookie [${this.currentIndex + 1}/${this.cookies.length}] 已永久禁用，跳过`);
        this.currentIndex = (this.currentIndex + 1) % this.cookies.length;
        this.currentCookieRequests = 0;
        attempts++;
        continue;
      }

      this.currentCookieRequests++;
      cookie.requestCount++;
      cookie.lastUsed = Date.now();

      console.log(`[DEBUG] 使用 Cookie [${this.currentIndex + 1}/${this.cookies.length}] (第${this.currentCookieRequests}/${this.requestsPerCookie}次, 轮询失败:${cookie.rotationFailures}/${this.maxRotationFailures})`);
      
      // 检查是否需要切换到下一个 Cookie
      if (this.currentCookieRequests >= this.requestsPerCookie) {
        this.currentCookieRequests = 0;
        this.currentIndex = (this.currentIndex + 1) % this.cookies.length;
        console.log(`[DEBUG] 切换到下一个 Cookie [${this.currentIndex + 1}/${this.cookies.length}]`);
      }

      return cookie.cookie;
    }

    console.log(`[WARN] 所有 Cookie 都被永久禁用了`);
    return null;
  }

  // 记录成功
  recordSuccess(cookie: string) {
    const cookieInfo = this.cookies.find(c => c.cookie === cookie);
    if (cookieInfo) {
      cookieInfo.successCount++;
      cookieInfo.rotationFailures = 0; // 重置轮询失败计数
      console.log(`[DEBUG] Cookie 成功计数: ${cookieInfo.successCount}/${cookieInfo.requestCount} (重置轮询失败计数)`);
    }
  }

  // 记录失败（轮询失败）
  recordRotationFailure(cookie: string) {
    const cookieInfo = this.cookies.find(c => c.cookie === cookie);
    if (cookieInfo) {
      cookieInfo.failureCount++;
      cookieInfo.rotationFailures++;
      
      console.log(`[DEBUG] Cookie 轮询失败计数: ${cookieInfo.failureCount}/${cookieInfo.requestCount} (轮询失败: ${cookieInfo.rotationFailures}/${this.maxRotationFailures})`);
      
      // 检查是否需要永久禁用
      if (cookieInfo.rotationFailures >= this.maxRotationFailures) {
        cookieInfo.permanentlyDisabled = true;
        cookieInfo.disabledAt = Date.now();
        console.log(`[ERROR] Cookie [${this.cookies.indexOf(cookieInfo) + 1}] 轮询失败${cookieInfo.rotationFailures}次，已永久禁用`);
      }
    }
  }

  // 获取统计信息
  getStats() {
    return this.cookies.map((cookie, index) => ({
      index: index + 1,
      successCount: cookie.successCount,
      failureCount: cookie.failureCount,
      requestCount: cookie.requestCount,
      rotationFailures: cookie.rotationFailures,
      permanentlyDisabled: cookie.permanentlyDisabled,
      disabledAt: cookie.disabledAt,
      successRate: cookie.requestCount > 0 
        ? (cookie.successCount / cookie.requestCount * 100).toFixed(1) + '%'
        : '0%',
      isActive: index === this.currentIndex
    }));
  }

  // 获取当前 Cookie 索引
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // 获取当前 Cookie 已使用次数
  getCurrentCookieRequests(): number {
    return this.currentCookieRequests;
  }
}

// 全局 Cookie 轮询管理器
let cookieRoundRobin: CookieRoundRobin;

// 获取随机元素
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 获取随机延迟（3-5秒）
function getRandomDelay(): number {
  return 3000 + Math.random() * 2000; // 3000ms + 0-2000ms = 3-5秒
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 解析 Authorization 头获取 cookies
function parseAuthCookies(authHeader: string | null): string[] | null {
  if (!authHeader) return null;
  
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) return null;
  
  const token = bearerMatch[1].trim();
  if (["false", "null", "none"].includes(token.toLowerCase())) {
    return null;
  }
  
  return token.split(",").map(c => c.trim()).filter(c => c);
}

// 格式化消息为 LongCat 格式
function formatMessages(messages: any[]): string {
  return messages.map(msg => `${msg.role}:${msg.content}`).join(";");
}

// 带重试的会话创建
async function createSessionWithRetry(cookies: string[], userAgent: string): Promise<{ conversationId: string; usedCookie: string }> {
  const errors: string[] = [];
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    console.log(`[DEBUG] 尝试 Cookie [${i + 1}/${cookies.length}] 创建会话...`);
    
    try {
      const conversationId = await createSingleSession(cookie, userAgent);
      console.log(`[DEBUG] Cookie [${i + 1}/${cookies.length}] 会话创建成功`);
      return { conversationId, usedCookie: cookie };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Cookie [${i + 1}]: ${errorMsg}`);
      console.log(`[DEBUG] Cookie [${i + 1}/${cookies.length}] 会话创建失败: ${errorMsg}`);
      
      // 记录失败
      if (cookieRoundRobin) {
        cookieRoundRobin.recordFailure(cookie);
      }
      
      // 如果不是最后一个 Cookie，继续尝试下一个
      if (i < cookies.length - 1) {
        console.log(`[DEBUG] 尝试下一个 Cookie...`);
        continue;
      }
    }
  }
  
  // 所有 Cookie 都失败了
  throw new Error(`所有 Cookie 都失败了: ${errors.join('; ')}`);
}

// 单个 Cookie 会话创建
async function createSingleSession(cookie: string, userAgent: string): Promise<string> {
  console.log(`[DEBUG] 使用 API_BASEURL: ${API_BASEURL}`);
  console.log(`[DEBUG] Cookie 长度: ${cookie.length}`);
  console.log(`[DEBUG] User-Agent: ${userAgent}`);
  
  const response = await fetch(`${API_BASEURL}/api/v1/session-create`, {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      "X-Client-Language": "zh",
      "Referer": `${API_BASEURL}/`,
      "Cookie": `passport_token_key=${cookie}`
    },
    body: JSON.stringify({
      model: "",
      agentId: ""
    })
  });

  if (!response.ok) {
    console.log(`[DEBUG] 会话创建失败 - HTTP ${response.status}`);
    const errorText = await response.text();
    console.log(`[DEBUG] 错误响应: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[DEBUG] 会话创建响应:`, data);
  
  if (data.code !== 0) {
    console.log(`[DEBUG] 会话创建错误 - 代码: ${data.code}, 消息: ${data.message}`);
    throw new Error(data.message);
  }

  console.log(`[DEBUG] 会话创建成功 - conversationId: ${data.data.conversationId}`);
  return data.data.conversationId;
}

// 删除会话（带随机延迟）
async function deleteSession(conversationId: string, cookie: string, userAgent: string): Promise<void> {
  try {
    // 随机延迟3-5秒
    const delayMs = getRandomDelay();
    console.log(`Waiting ${delayMs}ms before deleting session ${conversationId}`);
    await delay(delayMs);
    
    const response = await fetch(`${API_BASEURL}/api/v1/session-delete?conversationId=${conversationId}`, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        "X-Client-Language": "zh",
        "Referer": `${API_BASEURL}/c/${conversationId}`,
        "Cookie": `passport_token_key=${cookie}`
      }
    });

    if (!response.ok) {
      console.error(`Failed to delete session: ${response.status}`);
    } else {
      console.log(`Successfully deleted session ${conversationId}`);
    }
  } catch (error) {
    console.error(`Error deleting session: ${error}`);
  }
}

// 异步删除会话（不等待）
function scheduleSessionDeletion(conversationId: string, cookie: string, userAgent: string): void {
  // 在后台执行删除，不阻塞响应
  deleteSession(conversationId, cookie, userAgent).catch(error => {
    console.error(`Background session deletion failed: ${error}`);
  });
}

// 解析 SSE 数据行
function parseSSELine(line: string): any | null {
  if (!line.startsWith("data:")) return null;
  
  const jsonStr = line.slice(5).trim();
  if (!jsonStr || jsonStr === "[DONE]") return null;
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

// 处理流式响应
async function handleStreamResponse(
  response: Response,
  stream: boolean,
  model: string,
  conversationId: string,
  cookie: string,
  userAgent: string
): Promise<Response> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (!stream) {
    // 非流式：收集所有内容
    let fullContent = "";
    let buffer = "";
    const reader = response.body!.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 保留最后一个可能不完整的行
        
        for (const line of lines) {
          const data = parseSSELine(line);
          if (data?.choices?.[0]?.delta?.content) {
            fullContent += data.choices[0].delta.content;
          }
        }
      }
      
      // 处理剩余的 buffer
      if (buffer) {
        const data = parseSSELine(buffer);
        if (data?.choices?.[0]?.delta?.content) {
          fullContent += data.choices[0].delta.content;
        }
      }
    } finally {
      // 在后台删除会话（带延迟）
      scheduleSessionDeletion(conversationId, cookie, userAgent);
    }

    // 返回非流式响应
    const responseData = {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: fullContent
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    return new Response(JSON.stringify(responseData), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 流式响应
  let buffer = "";
  let isFirstChunk = true;
  let sessionDeleted = false;
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最后一个可能不完整的行
      
      for (const line of lines) {
        const data = parseSSELine(line);
        if (!data) continue;
        
        // 第一个块，发送角色信息
        if (isFirstChunk && data.choices?.[0]?.delta?.role) {
          const roleChunk = {
            id: `chatcmpl-${data.id || crypto.randomUUID()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: { role: "assistant" },
              finish_reason: null
            }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(roleChunk)}\n\n`));
          isFirstChunk = false;
        }
        
        // 处理内容块
        if (data.choices?.[0]?.delta?.content) {
          const contentChunk = {
            id: `chatcmpl-${data.id || crypto.randomUUID()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: { content: data.choices[0].delta.content },
              finish_reason: null
            }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
        }
        
        // 处理结束
        if (data.choices?.[0]?.finishReason === "stop") {
          const stopChunk = {
            id: `chatcmpl-${data.id || crypto.randomUUID()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: "stop"
            }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
        }
        
        // 如果是最后一条消息，发送 [DONE] 并删除会话
        if (data.lastOne === true) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          if (!sessionDeleted) {
            sessionDeleted = true;
            // 在后台删除会话（带延迟）
            scheduleSessionDeletion(conversationId, cookie, userAgent);
          }
        }
      }
    },
    
    async flush(controller) {
      // 处理剩余的 buffer
      if (buffer) {
        const data = parseSSELine(buffer);
        if (data?.choices?.[0]?.delta?.content) {
          const contentChunk = {
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: { content: data.choices[0].delta.content },
              finish_reason: null
            }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
        }
      }
      
      // 确保发送结束标记
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      
      // 如果还没删除会话，在后台删除（带延迟）
      if (!sessionDeleted) {
        sessionDeleted = true;
        scheduleSessionDeletion(conversationId, cookie, userAgent);
      }
    }
  });

  return new Response(
    response.body!.pipeThrough(transformStream),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    }
  );
}

// 主处理函数
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // 处理 /v1/models 请求
  if (url.pathname === "/v1/models" && request.method === "GET") {
    const modelsResponse = {
      object: "list",
      data: [
        {
          id: "LongCat",
          object: "model",
          created: Math.floor(Date.now() / 1000),
          owned_by: "longcat"
        },
        {
          id: "LongCat-Search",
          object: "model",
          created: 1753777714,
          owned_by: "longcat"
        }
      ]
    };
    
    return new Response(JSON.stringify(modelsResponse), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 处理 /stats 请求 - 查看 Cookie 状态
  if (url.pathname === "/stats" && request.method === "GET") {
    if (!cookieRoundRobin) {
      return new Response(JSON.stringify({
        error: "Cookie 轮询器未初始化"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const stats = cookieRoundRobin.getStats();
    return new Response(JSON.stringify({
      totalCookies: stats.length,
      currentCookie: cookieRoundRobin.getCurrentIndex() + 1,
      currentRequests: cookieRoundRobin.getCurrentCookieRequests(),
      cookies: stats
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 处理 /v1/chat/completions 请求
  if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
    let conversationId: string | null = null;
    let selectedCookie: string | null = null;
    let userAgent: string | null = null;
    
    try {
      // 解析请求体
      const body = await request.json();
      const { messages, stream = false, model = "LongCat" } = body;

      // 获取 cookie - 使用 Cookie 轮询器
      const authHeader = request.headers.get("Authorization");
      const userCookies = parseAuthCookies(authHeader);
      
      let cookiesToUse: string[];
      if (userCookies && userCookies.length > 0) {
        // 使用用户提供的 cookies
        cookiesToUse = userCookies;
        if (!cookieRoundRobin) {
          cookieRoundRobin = new CookieRoundRobin(userCookies);
        }
      } else {
        // 使用环境变量中的 cookies
        const envCookies = AUTH_COOKIES.split(",").filter(c => c.trim());
        cookiesToUse = envCookies;
        if (!cookieRoundRobin) {
          cookieRoundRobin = new CookieRoundRobin(envCookies);
        }
      }
      
      // 获取随机 UA
      userAgent = getRandomElement(USER_AGENTS);

      // 使用轮询获取 Cookie，如果失败则重试所有 Cookie
      let sessionResult: { conversationId: string; usedCookie: string };
      
      // 首先尝试当前轮询的 Cookie
      const currentCookie = cookieRoundRobin.getNextCookie();
      if (currentCookie) {
        try {
          sessionResult = await createSessionWithRetry([currentCookie], userAgent);
          selectedCookie = sessionResult.usedCookie;
          conversationId = sessionResult.conversationId;
          
          // 记录成功
          cookieRoundRobin.recordSuccess(selectedCookie);
        } catch (error) {
          console.log(`[DEBUG] 当前轮询 Cookie 失败，记录轮询失败...`);
          // 记录轮询失败
          cookieRoundRobin.recordRotationFailure(currentCookie);
          
          console.log(`[DEBUG] 尝试所有可用 Cookie...`);
          // 如果当前 Cookie 失败，尝试所有可用的 Cookie（排除永久禁用的）
          const availableCookies = cookiesToUse.filter(cookie => {
            const cookieInfo = cookieRoundRobin['cookies'].find((c: any) => c.cookie === cookie);
            return !cookieInfo?.permanentlyDisabled;
          });
          
          if (availableCookies.length === 0) {
            throw new Error("所有 Cookie 都被永久禁用了");
          }
          
          sessionResult = await createSessionWithRetry(availableCookies, userAgent);
          selectedCookie = sessionResult.usedCookie;
          conversationId = sessionResult.conversationId;
          
          // 记录成功
          cookieRoundRobin.recordSuccess(selectedCookie);
        }
      } else {
        // 没有可用的 Cookie
        throw new Error("没有可用的 Cookie");
      }

      // 准备聊天请求
      const formattedContent = formatMessages(messages);
      const searchEnabled = model.toLowerCase().includes("search") ? 1 : 0;

      // 发送聊天请求
      const chatResponse = await fetch(`${API_BASEURL}/api/v1/chat-completion`, {
        method: "POST",
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/event-stream,application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-Client-Language": "zh",
          "Referer": `${API_BASEURL}/c/${conversationId}`,
          "Cookie": `passport_token_key=${selectedCookie}`
        },
        body: JSON.stringify({
          conversationId,
          content: formattedContent,
          reasonEnabled: 0,
          searchEnabled,
          parentMessageId: 0
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`Chat request failed: ${chatResponse.status}`);
      }

      // 处理响应
      const response = await handleStreamResponse(chatResponse, stream, model, conversationId, selectedCookie, userAgent);
      return response;

    } catch (error) {
      // 如果出错，也在后台尝试删除会话（带延迟）
      if (conversationId && selectedCookie && userAgent) {
        scheduleSessionDeletion(conversationId, selectedCookie, userAgent);
      }
      
      return new Response(JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : "Internal server error",
          type: "internal_error",
          code: "internal_error"
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 404 for other routes
  return new Response("Not Found", { status: 404 });
}

// Bun/Node.js 入口
const server = Bun.serve({
  port: 8000,
  fetch: handleRequest
});

console.log(`Server running on http://localhost:${server.port}`);
