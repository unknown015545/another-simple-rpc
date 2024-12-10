import { z, ZodIssue, ZodType } from "zod";
import zodToJsonSchema, { JsonSchema7AnyType } from "zod-to-json-schema";

export interface RouteRequest<schema extends ZodType<any, any, any>> {
  method: string;
  params?: z.infer<schema>;
}

export interface RequestParams<context, schema extends ZodType<any, any, any>> {
  context: context;
  data: z.infer<schema>;
  originalRequest: RouteRequest<schema>;
}

export type RequestCallback<context, schema extends ZodType<any, any, any>> = (
  request: RequestParams<context, schema>,
) => any;

export interface Route<context, schema extends ZodType<any, any, any>> {
  method: string;
  callback: RequestCallback<context, schema>;
  schema?: ZodType<any, any, any> | undefined;
}

export interface RouteJSONSchema {
  method: string;
  schema?: JsonSchema7AnyType;
}

export class Router<context extends Record<string, any>> {
  context: context;
  #routes: Route<context, any>[];
  constructor(context: context) {
    this.#routes = [];
    this.context = context;
  }

  addRoute<schema extends ZodType<any, any, any>>(
    method: string,
    callback: RequestCallback<context, schema>,
    schema?: schema,
  ) {
    this.#routes.push({
      method,
      callback,
      schema,
    });
  }
  get JSONSchemaRoutes(): RouteJSONSchema[] {
    const jsonSchemaRoutes: RouteJSONSchema[] = [];

    this.#routes.map((route) => {
      if (!route.schema) {
        jsonSchemaRoutes.push({
          method: route.method,
        });
        return;
      }

      jsonSchemaRoutes.push({
        method: route.method,
        schema: zodToJsonSchema(route.schema),
      });
    });

    return jsonSchemaRoutes
  }

  get routes(): Route<context, any>[] {
    return this.#routes
  }
  
}

export interface SuccessResponseType<response> {
  response: response
  success: true
}

export interface ErrorResponseType<properties> {
  type: string
  success: false
  additionalProperties: properties
}

export class SuccessResponse<response = undefined> implements SuccessResponseType<response> {
  success = true as const
  response: response = undefined as response;
  constructor(response?: response) {
    if(response) this.response = response
  }
}

export class ErrorResponse<properties = undefined> implements ErrorResponseType<properties> {
  success = false as const
  type: string
  additionalProperties: properties = undefined as properties;

  constructor(type: string, additionalProperties?: properties) {
    this.type = type
    if(additionalProperties) this.additionalProperties = additionalProperties
  }
}

export const errorResponses = {
  invalidRequest(error: ZodIssue[]) { return new ErrorResponse("INVALID_REQUEST", error) },
  methodNotFound: new ErrorResponse("METHOD_NOT_FOUND"),
  unknownError: new ErrorResponse("UNKNOWN_ERROR"),
  paramaterInvalid(err: ZodIssue[]) { return new ErrorResponse("INVALID_PARAMATER", err) }
}

export const RouteRequest = z.object({
  method: z.string(),
  params: z.any().optional()
})


export function handleRequest(router: Router<any>, request: RouteRequest<any>): ErrorResponse<any> | SuccessResponse<any> {
  const validation = RouteRequest.safeParse(request)
  if(!validation.success) {
      return errorResponses.invalidRequest(validation.error.errors)
  }

  const route = router.routes.find((route) => route.method == request.method)

  if(!route) {
    return errorResponses.methodNotFound
  }

  if(route.schema) {
    const validaiton = route.schema.safeParse(request.params)

    if(!validaiton.success) {
      return errorResponses.paramaterInvalid(validaiton.error.errors)
    }
  }
  try {
    const response = route.callback({
      context: router.context,
      data: request.params,
      originalRequest: request
    })
    if(response instanceof SuccessResponse) {
      return response
    }

    return new SuccessResponse(response)
  } catch(err) {
    if(err instanceof ErrorResponse) {
      return err
    }

    return errorResponses.unknownError
  }
}