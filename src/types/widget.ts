/**
 * Widget and component types for dashboard visualization
 */

import type { EntityId } from './dashboard';
import type { IDataSource } from './data';

/** Widget types supported by the dashboard */
export type WidgetType = 'chart' | 'metric' | 'table' | 'gauge' | 'list' | 'custom';

/** Size specification for widgets */
export interface IWidgetSize {
  /** Width (in grid units or pixels) */
  width: number;
  
  /** Height (in grid units or pixels) */
  height: number;
  
  /** Minimum width */
  minWidth?: number;
  
  /** Minimum height */
  minHeight?: number;
  
  /** Maximum width */
  maxWidth?: number;
  
  /** Maximum height */
  maxHeight?: number;
}

/** Position specification for widgets */
export interface IWidgetPosition {
  /** X coordinate (grid column or pixel) */
  x: number;
  
  /** Y coordinate (grid row or pixel) */
  y: number;
}

/** Base widget interface */
export interface Widget {
  /** Unique identifier for the widget */
  id: EntityId;
  
  /** Display title of the widget */
  title: string;
  
  /** Type of widget to render */
  type: WidgetType;
  
  /** Position on dashboard */
  position: IWidgetPosition;
  
  /** Size of the widget */
  size: IWidgetSize;
  
  /** Data source configuration for this widget */
  dataSource: IDataSource;
  
  /** Widget-specific configuration */
  config: IWidgetConfig;
  
  /** Visual styling for this widget */
  style?: IWidgetStyle;
  
  /** Indicates if widget is visible */
  isVisible: boolean;
  
  /** Indicates if widget is locked from editing */
  isLocked: boolean;
  
  /** Refresh interval in milliseconds (0 = no auto-refresh) */
  refreshInterval?: number;
  
  /** Custom metadata for external parties */
  metadata?: Record<string, unknown>;
}

/** Widget configuration base interface */
export interface IWidgetConfig {
  /** Unique identifier for this config */
  id?: string;
  
  /** Show widget title */
  showTitle?: boolean;
  
  /** Show border */
  showBorder?: boolean;
  
  /** Enable interactions */
  enableInteractions?: boolean;
  
  /** Custom widget-specific settings */
  customSettings?: Record<string, unknown>;
}

/** Widget styling interface */
export interface IWidgetStyle {
  /** Background color */
  backgroundColor?: string;
  
  /** Border color */
  borderColor?: string;
  
  /** Border width (in pixels) */
  borderWidth?: number;
  
  /** Border radius (in pixels) */
  borderRadius?: number;
  
  /** Padding (in pixels) */
  padding?: number;
  
  /** Shadow effect */
  boxShadow?: string;
  
  /** Opacity (0-1) */
  opacity?: number;
  
  /** Custom CSS classes */
  customClasses?: string[];
  
  /** Custom inline styles */
  customStyles?: Record<string, string>;
}

/** Chart-specific widget configuration */
export interface IChartWidgetConfig extends IWidgetConfig {
  /** Chart type */
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'mixed';
  
  /** Show legend */
  showLegend?: boolean;
  
  /** Show grid */
  showGrid?: boolean;
  
  /** X-axis label */
  xAxisLabel?: string;
  
  /** Y-axis label */
  yAxisLabel?: string;
  
  /** Enable zoom */
  enableZoom?: boolean;
  
  /** Enable pan */
  enablePan?: boolean;
}

/** Metric/KPI widget configuration */
export interface IMetricWidgetConfig extends IWidgetConfig {
  /** Format for displaying metric value */
  format?: 'number' | 'percentage' | 'currency' | 'custom';
  
  /** Number of decimal places */
  decimals?: number;
  
  /** Currency symbol (if format is currency) */
  currencySymbol?: string;
  
  /** Show comparison value (e.g., previous month) */
  showComparison?: boolean;
  
  /** Show trend indicator */
  showTrend?: boolean;
  
  /** Threshold values for conditional styling */
  thresholds?: IThreshold[];
}

/** Table widget configuration */
export interface ITableWidgetConfig extends IWidgetConfig {
  /** Column definitions */
  columns?: ITableColumn[];
  
  /** Enable sorting */
  enableSorting?: boolean;
  
  /** Enable filtering */
  enableFiltering?: boolean;
  
  /** Enable pagination */
  enablePagination?: boolean;
  
  /** Rows per page */
  rowsPerPage?: number;
  
  /** Striped rows */
  striped?: boolean;
  
  /** Enable row selection */
  enableRowSelection?: boolean;
}

/** Table column definition */
export interface ITableColumn {
  /** Column identifier */
  id: string;
  
  /** Display header */
  header: string;
  
  /** Data field to bind to */
  field: string;
  
  /** Column width */
  width?: number | string;
  
  /** Format function */
  format?: (value: unknown) => string;
  
  /** Sort comparator function */
  sort?: (a: unknown, b: unknown) => number;
  
  /** Is column sortable */
  sortable?: boolean;
  
  /** Is column filterable */
  filterable?: boolean;
}

/** Threshold for conditional styling */
export interface IThreshold {
  /** Threshold value */
  value: number;
  
  /** Comparison operator */
  operator: '>' | '<' | '>=' | '<=' | '==';
  
  /** Color to apply */
  color?: string;
  
  /** Label/description */
  label?: string;
}

/** Widget mutation event payload */
export interface IWidgetMutation {
  /** Widget ID being mutated */
  widgetId: EntityId;
  
  /** Type of mutation */
  mutationType: 'create' | 'update' | 'delete' | 'move' | 'resize';
  
  /** Changed properties */
  changes: Partial<Widget>;
  
  /** Previous state (for undo/redo) */
  previousState?: Partial<Widget>;
}
