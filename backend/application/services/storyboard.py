from ai_anidrama.application.dtos.storyboard import (
    UploadRequest,
    BatchUploadRequest,
    UploadResponse,
    BatchUploadResponse,
)


class StoryboardService:
    async def upload_single(self, body: UploadRequest) -> UploadResponse:
        return UploadResponse(
            code=200,
            message="上传成功",
            data={
                "segment_id": body.segment_id,
                "asset_id": "asset_" + body.segment_id,
                "url": f"https://example.com/storyboard/{body.project_id}/{body.segment_id}",
            },
        )

    async def upload_batch(self, body: BatchUploadRequest) -> BatchUploadResponse:
        results = []
        success_count = 0
        failed_count = 0

        for segment_id in body.segment_ids:
            try:
                results.append(
                    {
                        "success": True,
                        "segment_id": segment_id,
                        "asset_id": "asset_" + segment_id,
                        "url": f"https://example.com/storyboard/{body.project_id}/{segment_id}",
                    }
                )
                success_count += 1
            except Exception as e:
                results.append({"success": False, "error": str(e), "segment_id": segment_id})
                failed_count += 1

        return BatchUploadResponse(
            code=200 if failed_count == 0 else 207,
            message=f"批量上传完成，成功 {success_count} 张，失败 {failed_count} 张",
            data=results,
            success_count=success_count,
            failed_count=failed_count,
        )