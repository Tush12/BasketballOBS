import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  createdTime?: string;
  modifiedTime?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const driveApiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
      return NextResponse.json(
        {
          error:
            "Supabase environment variables are missing. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
        },
        { status: 500 }
      );
    }

    if (!driveApiKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_DRIVE_API_KEY is not configured. Add it to .env.local, then restart the Next.js server.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid login session." }, { status: 401 });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || roleRow?.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const albumId = typeof body?.albumId === "string" ? body.albumId : "";

    if (!albumId) {
      return NextResponse.json({ error: "albumId is required." }, { status: 400 });
    }

    const { data: album, error: albumError } = await supabase
      .from("photo_albums")
      .select("id,drive_folder_id,title")
      .eq("id", albumId)
      .maybeSingle();

    if (albumError || !album) {
      return NextResponse.json(
        { error: albumError?.message ?? "Photo album not found." },
        { status: 404 }
      );
    }

    const allFiles: DriveFile[] = [];
    let pageToken = "";

    do {
      const params = new URLSearchParams({
        q: `'${album.drive_folder_id}' in parents and trashed = false`,
        key: driveApiKey,
        pageSize: "1000",
        fields: "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)",
        orderBy: "createdTime,name",
        spaces: "drive",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        cache: "no-store",
      });

      const drivePayload = (await response.json().catch(() => ({}))) as DriveListResponse;

      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              drivePayload?.error?.message ??
              "Google Drive could not read this folder. Make sure the folder is shared as Anyone with the link · Viewer and the Drive API key is valid.",
          },
          { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
        );
      }

      allFiles.push(...(drivePayload.files ?? []));
      pageToken = drivePayload.nextPageToken ?? "";
    } while (pageToken);

    const images = allFiles
      .filter((file) => file.mimeType?.startsWith("image/"))
      .map((file, index) => ({
        drive_file_id: file.id,
        name: file.name,
        mime_type: file.mimeType ?? null,
        drive_created_time: file.createdTime ?? null,
        drive_modified_time: file.modifiedTime ?? null,
        sort_order: index,
      }));

    const { data: count, error: syncError } = await supabase.rpc(
      "admin_sync_photo_album_items",
      {
        p_album_id: albumId,
        p_items: images,
      }
    );

    if (syncError) {
      return NextResponse.json({ error: syncError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      albumId,
      albumTitle: album.title,
      count: Number(count ?? images.length),
      skippedNonImages: Math.max(0, allFiles.length - images.length),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected photo sync error." },
      { status: 500 }
    );
  }
}
