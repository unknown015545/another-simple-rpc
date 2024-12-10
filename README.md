# Simple RPC JS
Simple RPC implementation in Typescript. 

## Implementation
Request: 
```ts
{
    method: string,
    params?: any
}
```

Success Response:
```ts
{
    response: any,
    success: true
}
```

Error Response:
```ts
{
    type: string,
    success: false,
    additionalProperties?: any
}
```

## Usage
```ts
import { Router, handleReqeust } from 'simple-rpc'
import { z } from 'zod'

const router = new Router()

router.addRoute("ping", () => "pong")
router.addRoute("schemaTest", (request) => request.data, z.string())

const request = {
    method: "ping"
}
const response = handleRequest(router, request)
console.log(response)
```