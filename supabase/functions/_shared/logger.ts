type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  context?: Record<string, unknown>;
}

function emit(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(json);
      break;
    case "warn":
      console.warn(json);
      break;
    case "debug":
      console.debug(json);
      break;
    default:
      console.log(json);
  }
}

export function createLogger(fnName: string) {
  const log = (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ) => {
    emit({
      timestamp: new Date().toISOString(),
      level,
      function: fnName,
      message,
      context,
    });
  };

  return {
    info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
    debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),

    /** Log an HTTP error from an external API call */
    httpError: (
      api: string,
      statusCode: number,
      detail?: string
    ) => {
      log("error", `${api} HTTP ${statusCode}`, {
        api,
        statusCode,
        detail,
        category:
          statusCode === 401 || statusCode === 403
            ? "auth"
            : statusCode === 429
              ? "rate_limit"
              : statusCode >= 500
                ? "server"
                : "client",
      });
    },

    /** Log a job state transition */
    jobTransition: (
      jobType: string,
      jobId: string,
      from: string,
      to: string,
      extra?: Record<string, unknown>
    ) => {
      log("info", `Job ${jobType}:${jobId} ${from} -> ${to}`, {
        jobType,
        jobId,
        fromStatus: from,
        toStatus: to,
        ...extra,
      });
    },
  };
}
