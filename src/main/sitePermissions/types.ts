import type { MediaAccessPermissionRequest, OpenExternalPermissionRequest, PermissionRequest } from 'electron';

export type PermissionDetails = PermissionRequest | MediaAccessPermissionRequest | OpenExternalPermissionRequest;
