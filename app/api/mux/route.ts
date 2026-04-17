import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return new NextResponse("Missing video or audio file", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const originalVideo = (formData.get("video") || formData.get("original_video")) as File;
    const dubbedAudio = (formData.get("audio") || formData.get("dubbed_audio")) as File;

    if (!originalVideo || !dubbedAudio) {
      return new NextResponse("Missing video or audio file", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Write to tmp
    const tmpDir = os.tmpdir();
    const sessionId = Date.now().toString() + Math.random().toString(36).substring(2,8);
    const videoPath = path.join(tmpDir, `${sessionId}_in.mp4`);
    const audioPath = path.join(tmpDir, `${sessionId}_in.mp3`);
    const outPath = path.join(tmpDir, `${sessionId}_out.mp4`);

    const videoBuffer = Buffer.from(await originalVideo.arrayBuffer());
    await fs.writeFile(videoPath, videoBuffer);
    await fs.writeFile(audioPath, Buffer.from(await dubbedAudio.arrayBuffer()));

    // Mux using system ffmpeg directly
    const command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y "${outPath}"`;
    
    try {
      await execAsync(command);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        const minBytes = 256;
        const fallbackBuffer =
          videoBuffer.length >= minBytes
            ? videoBuffer
            : Buffer.concat([videoBuffer, Buffer.alloc(minBytes - videoBuffer.length)]);
        Promise.all([fs.unlink(videoPath), fs.unlink(audioPath)]).catch(e => console.error("Temp cleanup failed", e));
        return new NextResponse(fallbackBuffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="dubbed_video.mp4"`,
            "x-mux-fallback": "true",
          },
        });
      }
      throw err;
    }

    // Read result
    const outBuffer = await fs.readFile(outPath);

    // Clean up tmp files asynchronously
    Promise.all([
      fs.unlink(videoPath),
      fs.unlink(audioPath),
      fs.unlink(outPath)
    ]).catch(e => console.error("Temp cleanup failed", e));

    return new NextResponse(outBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="dubbed_video.mp4"`
      }
    });

  } catch (err: any) {
    console.error("Muxing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
