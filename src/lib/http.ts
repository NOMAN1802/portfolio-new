import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { appUrl } from "./env";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function origin(req: NextRequest) {
  const supplied = req.headers.get("origin");
  const expected = new URL(appUrl()).origin;
  // While developing, the site may be opened on any local host or port
  // (localhost:3000, 127.0.0.1:5000), so accept the host being served.
  const sameHost =
    process.env.NODE_ENV !== "production" &&
    !!supplied &&
    new URL(supplied).host === req.headers.get("host");
  if (!supplied || (supplied !== expected && !sameHost))
    throw new HttpError(403, "This request must come from this website.");
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new HttpError(415, "Use JSON for this request.");
}
export async function body(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 100_000) throw new HttpError(413, "Request too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function endpoint(
  fn: (req: NextRequest) => Promise<unknown>,
  mutation = false,
) {
  return async (req: NextRequest) => {
    try {
      if (mutation) origin(req);
      const result = await fn(req);
      const response =
        result instanceof Response ? result : NextResponse.json(result);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof HttpError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      if (error instanceof ZodError)
        return NextResponse.json(
          {
            error: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
          { status: 400 },
        );
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        return NextResponse.json(
          { error: "That slug or email is already in use." },
          { status: 409 },
        );
      console.error(
        "Request failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return NextResponse.json(
        {
          error:
            "The service is unavailable. Please check server configuration or try again.",
        },
        { status: 503 },
      );
    }
  };
}
