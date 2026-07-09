import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Documents an endpoint that returns the paginated `{ data, meta }` envelope
 * for the given model, so Swagger shows the real response shape.
 *
 *   `@ApiPaginatedResponse(UserResponseDto)`
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              totalItems: { type: 'number', example: 137 },
              totalPages: { type: 'number', example: 7 },
              hasPreviousPage: { type: 'boolean', example: false },
              hasNextPage: { type: 'boolean', example: true },
            },
          },
        },
      },
    }),
  );
