import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const originalVideo = formData.get("video") as File;
    const dubbedAudio = formData.get("audio") as File;

    if (!originalVideo || !dubbedAudio) {
      return NextResponse.json({ error: "Missing video or audio file" }, { status: 400 });
    }

    // Write to tmp
    const tmpDir = os.tmpdir();
    const sessionId = Date.now().toString() + Math.random().toString(36).substring(2,8);
    const videoPath = path.join(tmpDir, `${sessionId}_in.mp4`);
    const audioPath = path.join(tmpDir, `${sessionId}_in.mp3`);
    const outPath = path.join(tmpDir, `${sessionId}_out.mp4`);

    await fs.writeFile(videoPath, Buffer.from(await originalVideo.arrayBuffer()));
    await fs.writeFile(audioPath, Buffer.from(await dubbedAudio.arrayBuffer()));

    // Mux using system ffmpeg directly
    const command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y "${outPath}"`;
    
    await execAsync(command);

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
