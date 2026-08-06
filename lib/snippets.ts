export function generateCurlSnippet(apiKey: string): string {
  return `curl -X POST https://your-domain.com/api/logs \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "stackTrace": "TypeError: Cannot read property \\"map\\" of undefined\\n  at processArray (/app/lib/utils.ts:42:15)\\n  at async main (/app/index.ts:10:5)",
    "requestBody": {"userId": "123"},
    "responseBody": {"error": "Internal server error"}
  }'`
}

export function generateJavaScriptSnippet(apiKey: string): string {
  return `const sendErrorLog = async (stackTrace) => {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: window.location.pathname,
      method: 'POST',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      stackTrace: stackTrace,
      requestBody: {},
      responseBody: { error: 'Internal server error' }
    })
  });
  const data = await response.json();
  return data;
};`
}

export function generatePythonSnippet(apiKey: string): string {
  return `import requests
import json
from datetime import datetime

def send_error_log(stack_trace):
    url = 'https://your-domain.com/api/logs'
    headers = {
        'Authorization': f'Bearer ${apiKey}',
        'Content-Type': 'application/json'
    }
    payload = {
        'endpoint': '/api/endpoint',
        'method': 'POST',
        'statusCode': 500,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'stackTrace': stack_trace,
        'requestBody': {},
        'responseBody': {'error': 'Internal server error'}
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.json()`
}

export function generateNodeSnippet(apiKey: string): string {
  return `const axios = require('axios');

const sendErrorLog = async (stackTrace) => {
  try {
    const response = await axios.post('https://your-domain.com/api/logs', {
      endpoint: '/api/endpoint',
      method: 'POST',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      stackTrace: stackTrace,
      requestBody: {},
      responseBody: { error: 'Internal server error' }
    }, {
      headers: {
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending log:', error);
  }
};`
}

export function generateGoSnippet(apiKey: string): string {
  return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

func sendErrorLog(stackTrace string) {
    url := "https://your-domain.com/api/logs"
    
    payload := map[string]interface{}{
        "endpoint": "/api/endpoint",
        "method": "POST",
        "statusCode": 500,
        "timestamp": time.Now().UTC().Format(time.RFC3339),
        "stackTrace": stackTrace,
        "requestBody": map[string]interface{}{},
        "responseBody": map[string]string{"error": "Internal server error"},
    }
    
    payloadBytes, _ := json.Marshal(payload)
    
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
    req.Header.Set("Authorization", "Bearer ${apiKey}")
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error:", err)
    }
    defer resp.Body.Close()
}`
}

export function getSnippets(apiKey: string) {
  return {
    curl: {
      language: 'bash',
      label: 'cURL',
      code: generateCurlSnippet(apiKey),
    },
    javascript: {
      language: 'javascript',
      label: 'JavaScript (Fetch)',
      code: generateJavaScriptSnippet(apiKey),
    },
    python: {
      language: 'python',
      label: 'Python (requests)',
      code: generatePythonSnippet(apiKey),
    },
    nodejs: {
      language: 'javascript',
      label: 'Node.js (axios)',
      code: generateNodeSnippet(apiKey),
    },
    go: {
      language: 'go',
      label: 'Go (net/http)',
      code: generateGoSnippet(apiKey),
    },
  }
}
