import type { ComponentType } from 'react';
import type { BreakpointStage } from '@common/types';
import { RequestFields } from './RequestFields';
import { ResponseFields } from './ResponseFields';
import type { StageFieldsProps } from './types';

/** The fields a held request shows at each stage. */
export const STAGE_FIELDS: Record<BreakpointStage, ComponentType<StageFieldsProps>> = {
  request: RequestFields,
  response: ResponseFields,
};
