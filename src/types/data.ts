/**
 * Data source and API integration types
 */

/** Data source types supported by the dashboard */
export type DataSourceType = 'rest-api' | 'graphql' | 'websocket' | 'polling' | 'mock';

/** HTTP methods for REST API */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** Authentication types */
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2' | 'custom';

/** Data source configuration */
export interface IDataSource {
  /** Unique identifier for data source */
  id: string;
  
  /** Data source name */
  name: string;
  
  /** Type of data source */
  type: DataSourceType;
  
  /** Endpoint URL or connection string */
  endpoint: string;
  
  /** HTTP method (for REST API) */
  method?: HTTPMethod;
  
  /** Authentication configuration */
  auth?: IAuthConfig;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Query parameters */
  queryParams?: Record<string, unknown>;
  
  /** Request body/payload */
  payload?: Record<string, unknown>;
  
  /** Response data transformation */
  transform?: IDataTransform;
  
  /** Cache configuration */
  cache?: ICacheConfig;
  
  /** Error handling */
  errorHandling?: IErrorHandlingConfig;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Authentication configuration */
export interface IAuthConfig {
  /** Authentication type */
  type: AuthType;
  
  /** Authentication token/credentials */
  token?: string;
  
  /** Username (for basic auth) */
  username?: string;
  
  /** Password (for basic auth) */
  password?: string;
  
  /** API key */
  apiKey?: string;
  
  /** OAuth2 configuration */
  oauth2?: {
    clientId: string;
    clientSecret?: string;
    tokenEndpoint: string;
    scopes?: string[];
  };
  
  /** Custom auth implementation */
  custom?: Record<string, unknown>;
}

/** Data transformation configuration */
export interface IDataTransform {
  /** Enable transformation */
  enabled: boolean;
  
  /** JSONPath expression to extract data */
  jsonPath?: string;
  
  /** Mapping of source fields to display fields */
  fieldMapping?: Record<string, string>;
  
  /** Filter applied to data */
  filter?: (data: unknown[]) => unknown[];
  
  /** Sort configuration */
  sort?: ISortConfig[];
  
  /** Aggregation function */
  aggregate?: (data: unknown[]) => unknown;
  
  /** Custom transformation function */
  custom?: (data: unknown) => unknown;
}

/** Sort configuration */
export interface ISortConfig {
  /** Field to sort by */
  field: string;
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/** Cache configuration for data sources */
export interface ICacheConfig {
  /** Enable caching */
  enabled: boolean;
  
  /** Cache duration in milliseconds */
  duration: number;
  
  /** Cache strategy */
  strategy: 'memory' | 'localStorage' | 'sessionStorage' | 'custom';
  
  /** Cache key prefix */
  keyPrefix?: string;
  
  /** Custom cache implementation */
  custom?: Record<string, unknown>;
}

/** Error handling configuration */
export interface IErrorHandlingConfig {
  /** Retry on failure */
  retryEnabled: boolean;
  
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Retry delay in milliseconds */
  retryDelay?: number;
  
  /** Exponential backoff */
  exponentialBackoff?: boolean;
  
  /** Fallback data to use on error */
  fallbackData?: unknown;
  
  /** Error callback */
  onError?: (error: Error) => void;
}

/** API request configuration */
export interface IAPIRequestConfig {
  /** Request URL */
  url: string;
  
  /** HTTP method */
  method: HTTPMethod;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Authorization header */
  authorization?: string;
  
  /** Query string */
  queryString?: Record<string, unknown>;
  
  /** Request body */
  body?: unknown;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Enable credentials for CORS */
  withCredentials?: boolean;
  
  /** Custom configuration */
  custom?: Record<string, unknown>;
}

/** API response wrapper */
export interface IAPIResponse<T = unknown> {
  /** HTTP status code */
  status: number;
  
  /** Response status text */
  statusText: string;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Response data payload */
  data: T;
  
  /** Response timing information */
  timing?: {
    requestTime: Date;
    responseTime: Date;
    duration: number; // milliseconds
  };
}

/** Data row interface for table/list data */
export interface IDataRow {
  /** Unique row identifier */
  id: string;
  
  /** Row data values */
  [key: string]: unknown;
}

/** Data series for charts and graphs */
export interface IDataSeries {
  /** Series identifier */
  id: string;
  
  /** Series name for display */
  name: string;
  
  /** Data points */
  data: IDataPoint[];
  
  /** Series color */
  color?: string;
  
  /** Series metadata */
  metadata?: Record<string, unknown>;
}

/** Individual data point */
export interface IDataPoint {
  /** X value (or time) */
  x: unknown;
  
  /** Y value (or metric) */
  y: number;
  
  /** Optional label */
  label?: string;
  
  /** Optional color override */
  color?: string;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** Paginated data response */
export interface IPaginatedResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Total count of items */
  total: number;
  
  /** Current page number */
  page: number;
  
  /** Items per page */
  pageSize: number;
  
  /** Total number of pages */
  pageCount: number;
  
  /** Has next page */
  hasNextPage: boolean;
  
  /** Has previous page */
  hasPreviousPage: boolean;
}

/** Data source polling configuration */
export interface IPollingConfig {
  /** Enable polling */
  enabled: boolean;
  
  /** Polling interval in milliseconds */
  interval: number;
  
  /** Maximum polling attempts */
  maxAttempts?: number;
  
  /** Stop polling on error */
  stopOnError?: boolean;
}

/** WebSocket configuration for real-time data */
export interface IWebSocketConfig extends IDataSource {
  /** WebSocket URL */
  endpoint: string;
  
  /** Subscription message to send on connect */
  subscriptionMessage?: Record<string, unknown>;
  
  /** Message format parsing */
  messageFormat?: 'json' | 'text' | 'binary';
  
  /** Auto-reconnect settings */
  autoReconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delay?: number;
  };
}
