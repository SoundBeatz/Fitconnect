export const MODULE_KEYS = [
  'core_engine',
  'commerce',
  'combination_deals',
  'unified_invoicing',
  'customer_portal',
  'command_center',
  'gym_platform',
  'ai_services',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleCategory =
  | 'core'
  | 'commerce'
  | 'gym'
  | 'portal'
  | 'command_center'
  | 'ai'
  | 'integration';

export type ModuleLifecycleStatus = 'draft' | 'active' | 'deprecated' | 'retired';
export type OrganizationModuleStatus = 'pending' | 'enabled' | 'suspended' | 'disabled';
export type ModuleActivationSource = 'default' | 'manual' | 'subscription' | 'trial' | 'system';

export interface PlatformModule {
  id: string;
  module_key: ModuleKey;
  name: string;
  description: string;
  category: ModuleCategory;
  version: string;
  lifecycle_status: ModuleLifecycleStatus;
  is_core: boolean;
  is_billable: boolean;
  default_enabled: boolean;
  navigation_path: string | null;
  icon_key: string | null;
  configuration_schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationModule {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  module_id: string;
  status: OrganizationModuleStatus;
  source: ModuleActivationSource;
  configuration: Record<string, unknown>;
  enabled_at: string | null;
  disabled_at: string | null;
  trial_ends_at: string | null;
  subscription_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedModuleAccess {
  module: PlatformModule;
  activation: OrganizationModule | null;
  enabled: boolean;
  reason:
    | 'enabled'
    | 'not_activated'
    | 'suspended'
    | 'disabled'
    | 'trial_expired'
    | 'module_inactive';
}

export function resolveModuleAccess(
  module: PlatformModule,
  activation: OrganizationModule | null,
  now: Date = new Date(),
): ResolvedModuleAccess {
  if (module.lifecycle_status !== 'active') {
    return { module, activation, enabled: false, reason: 'module_inactive' };
  }

  if (!activation) {
    return { module, activation, enabled: false, reason: 'not_activated' };
  }

  if (activation.status === 'suspended') {
    return { module, activation, enabled: false, reason: 'suspended' };
  }

  if (activation.status === 'disabled' || activation.status === 'pending') {
    return { module, activation, enabled: false, reason: 'disabled' };
  }

  if (activation.trial_ends_at && new Date(activation.trial_ends_at).getTime() <= now.getTime()) {
    return { module, activation, enabled: false, reason: 'trial_expired' };
  }

  return { module, activation, enabled: true, reason: 'enabled' };
}

export function assertModuleKey(value: string): asserts value is ModuleKey {
  if (!MODULE_KEYS.includes(value as ModuleKey)) {
    throw new Error(`Unknown FitConnect module key: ${value}`);
  }
}
