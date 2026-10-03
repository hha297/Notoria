import type {
  ErrorAction,
  ErrorKind,
  ErrorResource,
  ErrorViewModel,
} from "./types";
import { normalizeError } from "./normalize";

const RESOURCE_LIST_HREF: Record<ErrorResource, string> = {
  exercise: "/exercises",
  vocabulary: "/vocabulary",
  reading: "/reading",
  writing: "/writing",
  theory: "/theory",
  listening: "/listening",
  speaking: "/speaking",
  folder: "/",
  generic: "/",
};

function resourceKeys(resource: ErrorResource): {
  titleKey: string;
  descriptionKey: string;
  primaryKey: string;
} {
  return {
    titleKey: `resources.${resource}.title`,
    descriptionKey: `resources.${resource}.description`,
    primaryKey: `resources.${resource}.primary`,
  };
}

/**
 * Build a presentation model with i18n keys (resolved by ErrorState).
 */
export function toErrorViewModel(
  error: unknown,
  options?: {
    resource?: ErrorResource;
    pathname?: string | null;
    referenceId?: string;
    includeReset?: boolean;
    signInCallbackUrl?: string;
  },
): ErrorViewModel {
  const normalized = normalizeError(error, options);
  const kind = normalized.kind;
  const resource = normalized.resource ?? options?.resource;

  if (kind === "resourceNotFound" && resource && resource !== "generic") {
    const keys = resourceKeys(resource);
    const referenceId = normalized.referenceId ?? options?.referenceId;
    return {
      kind,
      statusCode: 404,
      titleKey: keys.titleKey,
      descriptionKey: keys.descriptionKey,
      primaryAction: {
        labelKey: keys.primaryKey,
        href: RESOURCE_LIST_HREF[resource],
        variant: "default",
      },
      secondaryAction: reportAction(referenceId),
      referenceId,
      resource,
    };
  }

  const referenceId = normalized.referenceId ?? options?.referenceId;
  const base = viewForKind(kind, {
    includeReset: options?.includeReset,
    signInCallbackUrl: options?.signInCallbackUrl,
    retryAfterSeconds: normalized.retryAfterSeconds,
    referenceId,
  });

  return {
    ...base,
    referenceId,
    retryAfterSeconds: normalized.retryAfterSeconds,
    resource,
  };
}

function reportAction(referenceId?: string): ErrorAction {
  const href = referenceId
    ? `/support?ref=${encodeURIComponent(referenceId)}`
    : "/support";
  return {
    labelKey: "actions.report",
    href,
    variant: "outline",
  };
}

function viewForKind(
  kind: ErrorKind,
  options: {
    includeReset?: boolean;
    signInCallbackUrl?: string;
    retryAfterSeconds?: number;
    referenceId?: string;
  },
): ErrorViewModel {
  const tryAgain: ErrorAction = options.includeReset
    ? { labelKey: "actions.tryAgain", reset: true, variant: "default" }
    : { labelKey: "actions.tryAgain", reload: true, variant: "default" };
  const report = reportAction(options.referenceId);

  switch (kind) {
    case "unauthorized": {
      const callback = options.signInCallbackUrl
        ? `?callbackUrl=${encodeURIComponent(options.signInCallbackUrl)}`
        : "";
      return {
        kind,
        statusCode: 401,
        titleKey: "unauthorized.title",
        descriptionKey: "unauthorized.description",
        primaryAction: {
          labelKey: "unauthorized.primary",
          href: `/sign-in${callback}`,
          variant: "default",
        },
        secondaryAction: {
          labelKey: "actions.dashboard",
          href: "/",
          variant: "outline",
        },
      };
    }
    case "forbidden":
      return {
        kind,
        statusCode: 403,
        titleKey: "forbidden.title",
        descriptionKey: "forbidden.description",
        primaryAction: {
          labelKey: "actions.dashboard",
          href: "/",
          variant: "default",
        },
        secondaryAction: report,
      };
    case "rateLimit":
      return {
        kind,
        statusCode: 429,
        titleKey: "rateLimit.title",
        descriptionKey: "rateLimit.description",
        primaryAction: tryAgain,
        secondaryAction: report,
        retryAfterSeconds: options.retryAfterSeconds,
      };
    case "offline":
      return {
        kind,
        statusCode: 0,
        titleKey: "offline.title",
        descriptionKey: "offline.description",
        primaryAction: tryAgain,
        secondaryAction: report,
      };
    case "network":
      return {
        kind,
        statusCode: 0,
        titleKey: "network.title",
        descriptionKey: "network.description",
        primaryAction: tryAgain,
        secondaryAction: report,
      };
    case "timeout":
      return {
        kind,
        statusCode: 408,
        titleKey: "timeout.title",
        descriptionKey: "timeout.description",
        primaryAction: tryAgain,
        secondaryAction: report,
      };
    case "notFound":
    case "resourceNotFound":
      return {
        kind: "notFound",
        statusCode: 404,
        titleKey: "notFound.title",
        descriptionKey: "notFound.description",
        primaryAction: {
          labelKey: "actions.dashboard",
          href: "/",
          variant: "default",
        },
        secondaryAction: report,
      };
    case "server":
    default:
      return {
        kind: "server",
        statusCode: 500,
        titleKey: "server.title",
        descriptionKey: "server.description",
        primaryAction: tryAgain,
        secondaryAction: {
          labelKey: "actions.dashboard",
          href: "/",
          variant: "outline",
        },
        tertiaryAction: {
          ...report,
          variant: "ghost",
        },
      };
  }
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
