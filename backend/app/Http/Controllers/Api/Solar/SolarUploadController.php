<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarSite;
use App\Models\SolarUploadBatch;
use App\Models\SolarImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManagerStatic as Image;
use App\Notifications\SupervisorUpdateNotification;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

class SolarUploadController extends Controller
{
    /**
     * Get site data for the upload page (public, no auth)
     */
    public function getSiteData(string $token)
    {
        $site = SolarSite::where('supervisor_token', $token)
            ->where('is_active', true)
            ->with(['projects' => function ($q) {
                $q->where('status', 'active')
                  ->with(['sections' => fn($q) => $q->orderBy('sort_order'), 'projectTables' => fn($q) => $q->orderBy('table_number')]);
            }])
            ->first();

        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        return response()->json([
            'site'     => $site->only(['id', 'name', 'location']),
            'projects' => $site->projects,
        ]);
    }

    /**
     * Submit a batch of images with field report (public, no auth)
     */
    public function submit(Request $request, string $token)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $request->validate([
            'solar_section_id'  => 'required|exists:solar_sections,id',
            'work_date'         => 'required|date',
            'work_time'         => 'nullable|date_format:H:i',
            'participants'      => 'nullable|string|max:500',
            'programme'         => 'nullable|string|max:1000',
            'weather'           => 'nullable|string|max:100',
            'has_issue'         => 'nullable|boolean',
            'issue_description' => 'nullable|string|max:1000',
            'sub_section'       => 'nullable|string|max:255',
            'phase'             => 'nullable|in:before,after,general',
            'table_number'      => 'nullable|integer|min:1',
            'images'            => 'required|array|min:1|max:30',
            'images.*'          => 'required|image|mimes:jpeg,jpg,png,heic|max:20480', // 20MB max per image
            'uploaded_by'       => 'nullable|string|max:255',
        ]);

        // Create the batch record
        $batch = SolarUploadBatch::create([
            'solar_section_id'  => $request->solar_section_id,
            'sub_section'       => $request->sub_section,
            'phase'             => $request->phase ?? 'general',
            'table_number'      => $request->table_number,
            'work_date'         => $request->work_date,
            'work_time'         => $request->work_time,
            'participants'      => $request->participants,
            'programme'         => $request->programme,
            'weather'           => $request->weather,
            'has_issue'         => $request->has_issue ?? false,
            'issue_description' => $request->issue_description,
            'uploaded_by'       => $request->uploaded_by,
        ]);

        $savedImages = [];

        foreach ($request->file('images') as $file) {
            // Build a clean directory path: solar-images/{site_id}/{YYYY-MM-DD}/
            $dateFolder = now()->format('Y-m-d');
            $folder     = "solar-images/site-{$site->id}/{$dateFolder}";
            $filename   = uniqid('img_', true) . '.jpg';
            $relativePath = "{$folder}/{$filename}";
            $fullPath     = storage_path("app/public/{$relativePath}");

            // Ensure directory exists
            if (!is_dir(dirname($fullPath))) {
                mkdir(dirname($fullPath), 0755, true);
            }

            // Compress: scale down to max 1920px wide, convert to JPEG at 80% quality
            Image::make($file->getRealPath())
                ->resize(1920, null, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('jpg', 80)
                ->save($fullPath);

            $fileSize = filesize($fullPath);
            $publicUrl = url("storage/{$relativePath}");

            $image = SolarImage::create([
                'solar_upload_batch_id' => $batch->id,
                'image_path'            => $relativePath,
                'image_url'             => $publicUrl,
                'original_name'         => $file->getClientOriginalName(),
                'file_size'             => $fileSize,
            ]);

            $savedImages[] = $image;
        }

        // Notify admins
        $admins = User::whereIn('role', ['super_admin', 'solar_admin'])->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new SupervisorUpdateNotification(
                "New Site Update (Batch)",
                "A new field report has been uploaded by {$batch->uploaded_by} at {$site->name}.",
                $site->id,
                $batch->section->solar_project_id ?? null,
                'info',
                'batch',
                $batch->id
            ));
        }

        return response()->json([
            'message'       => 'Upload successful! ' . count($savedImages) . ' image(s) saved.',
            'batch_id'      => $batch->id,
            'images_saved'  => count($savedImages),
        ], 201);
    }

    /**
     * Get recent upload history for this site (public, no auth)
     */
    public function history(Request $request, string $token)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $batches = SolarUploadBatch::whereHas('section', function ($q) use ($site) {
            $q->whereHas('project', function ($q2) use ($site) {
                $q2->where('solar_site_id', $site->id);
            });
        })
        ->with(['section.project', 'images'])
        ->withCount('images')
        ->orderByDesc('created_at')
        ->take(50)
        ->get();

        $dailyUpdates = \App\Models\SolarDailyUpdate::whereHas('project', function ($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })
        ->with('images', 'project')
        ->orderByDesc('created_at')
        ->take(50)
        ->get();

        return response()->json([
            'batches' => $batches,
            'daily_updates' => $dailyUpdates
        ]);
    }

    /**
     * Submit a daily update (public, token auth)
     */
    public function submitDailyUpdate(Request $request, string $token)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'solar_project_id' => 'required|exists:solar_projects,id',
            'report_date' => 'required|date',
            'start_time' => 'nullable',
            'manpower' => 'nullable|string',
            'machines' => 'nullable|string',
            'weather' => 'nullable|string',
            'planned_tasks' => 'nullable|string',
            'notes' => 'nullable|string',
            'images.*' => 'image|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify project belongs to site
        $project = \App\Models\SolarProject::where('solar_site_id', $site->id)->find($request->solar_project_id);
        if (!$project) {
            return response()->json(['message' => 'Invalid project.'], 400);
        }

        $update = \App\Models\SolarDailyUpdate::create([
            'solar_project_id' => $project->id,
            'report_date' => $request->report_date,
            'start_time' => $request->start_time,
            'manpower' => $request->manpower,
            'machines' => $request->machines,
            'weather' => $request->weather,
            'planned_tasks' => $request->planned_tasks,
            'notes' => $request->notes,
        ]);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $dirPath = "solar-images/sites/{$site->id}/daily_updates/" . $update->report_date->format('Y-m-d');
                $filename = \Illuminate\Support\Str::random(20) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs($dirPath, $filename, 'public');
                
                \App\Models\SolarDailyUpdateImage::create([
                    'solar_daily_update_id' => $update->id,
                    'image_path' => $path,
                    'image_url' => url('storage/' . $path),
                    'original_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        // Notify admins
        $admins = User::whereIn('role', ['super_admin', 'solar_admin'])->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new SupervisorUpdateNotification(
                "New Daily Update",
                "A new daily update has been submitted for {$project->name} at {$site->name}.",
                $site->id,
                $project->id,
                'info',
                'daily_update',
                $update->id
            ));
        }

        return response()->json([
            'message' => 'Daily update submitted successfully',
            'data' => $update->load('images')
        ], 201);
    }

    /**
     * Update a daily update (public, token auth)
     */
    public function updateDailyUpdate(Request $request, string $token, $updateId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $update = \App\Models\SolarDailyUpdate::whereHas('project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($updateId);

        if (!$update) {
            return response()->json(['message' => 'Update not found.'], 404);
        }

        $validated = $request->validate([
            'report_date' => 'required|date',
            'start_time' => 'nullable',
            'manpower' => 'nullable|string',
            'machines' => 'nullable|string',
            'weather' => 'nullable|string',
            'planned_tasks' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $update->update($validated);

        // Notify admins
        $admins = User::whereIn('role', ['super_admin', 'solar_admin'])->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new SupervisorUpdateNotification(
                "Daily Update Edited",
                "A daily update has been modified for {$update->project->name} at {$site->name}.",
                $site->id,
                $update->project->id,
                'info',
                'daily_update',
                $update->id
            ));
        }

        return response()->json(['message' => 'Daily update updated successfully', 'data' => $update]);
    }

    /**
     * Update an existing batch (public, no auth)
     */
    public function updateBatch(Request $request, string $token, $batchId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $batch = SolarUploadBatch::whereHas('section.project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($batchId);

        if (!$batch) {
            return response()->json(['message' => 'Batch not found.'], 404);
        }

        $validated = $request->validate([
            'work_date'         => 'required|date',
            'work_time'         => 'nullable|date_format:H:i',
            'participants'      => 'nullable|string|max:500',
            'uploaded_by'       => 'nullable|string|max:255',
            'programme'         => 'nullable|string|max:1000',
            'weather'           => 'nullable|string|max:100',
            'has_issue'         => 'nullable|boolean',
            'issue_description' => 'nullable|string|max:1000',
            'sub_section'       => 'nullable|string|max:255',
            'phase'             => 'nullable|in:before,after,general',
            'table_number'      => 'nullable|integer|min:1',
        ]);

        $batch->update($validated);

        // Notify admins
        $admins = User::whereIn('role', ['super_admin', 'solar_admin'])->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new SupervisorUpdateNotification(
                "Site Update Edited (Batch)",
                "A field report batch has been modified at {$site->name}.",
                $site->id,
                $batch->section->solar_project_id ?? null,
                'info',
                'batch',
                $batch->id
            ));
        }

        return response()->json(['message' => 'Batch updated successfully', 'data' => $batch]);
    }

    /**
     * Add images to an existing batch (public, no auth)
     */
    public function addImages(Request $request, string $token, $batchId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $batch = SolarUploadBatch::whereHas('section.project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($batchId);

        if (!$batch) {
            return response()->json(['message' => 'Batch not found.'], 404);
        }

        $request->validate([
            'images'            => 'required|array|min:1|max:30',
            'images.*'          => 'required|image|mimes:jpeg,jpg,png,heic|max:20480',
        ]);

        $savedImages = [];

        foreach ($request->file('images') as $file) {
            $dateFolder = now()->format('Y-m-d');
            $folder     = "solar-images/site-{$site->id}/{$dateFolder}";
            $filename   = uniqid('img_', true) . '.jpg';
            $relativePath = "{$folder}/{$filename}";
            $fullPath     = storage_path("app/public/{$relativePath}");

            if (!is_dir(dirname($fullPath))) {
                mkdir(dirname($fullPath), 0755, true);
            }

            Image::make($file->getRealPath())
                ->resize(1920, null, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('jpg', 80)
                ->save($fullPath);

            $fileSize = filesize($fullPath);
            $publicUrl = url("storage/{$relativePath}");

            $image = SolarImage::create([
                'solar_upload_batch_id' => $batch->id,
                'image_path'            => $relativePath,
                'image_url'             => $publicUrl,
                'original_name'         => $file->getClientOriginalName(),
                'file_size'             => $fileSize,
            ]);

            $savedImages[] = $image;
        }

        return response()->json([
            'message'       => 'Images added successfully! ' . count($savedImages) . ' image(s) saved.',
            'images'        => $savedImages,
        ], 201);
    }

    /**
     * Delete an image from an existing batch (public, no auth)
     */
    public function deleteImage(Request $request, string $token, $imageId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $image = SolarImage::whereHas('batch.section.project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($imageId);

        if (!$image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        $path = storage_path('app/public/' . $image->image_path);
        if (file_exists($path)) {
            unlink($path);
        }
        $image->delete();

        return response()->json(['message' => 'Image deleted successfully.']);
    }

    /**
     * Add more images to a daily update
     */
    public function addDailyUpdateImages(Request $request, string $token, $updateId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $update = \App\Models\SolarDailyUpdate::whereHas('project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($updateId);

        if (!$update) {
            return response()->json(['message' => 'Update not found.'], 404);
        }

        $request->validate([
            'images'   => 'required|array|min:1|max:30',
            'images.*' => 'required|image|max:10240',
        ]);

        $savedImages = [];

        foreach ($request->file('images') as $file) {
            $dirPath = "solar-images/sites/{$site->id}/daily_updates/" . $update->report_date->format('Y-m-d');
            $filename = \Illuminate\Support\Str::random(20) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($dirPath, $filename, 'public');
            
            $image = \App\Models\SolarDailyUpdateImage::create([
                'solar_daily_update_id' => $update->id,
                'image_path' => $path,
                'image_url' => url('storage/' . $path),
                'original_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
            ]);

            $savedImages[] = $image;
        }

        return response()->json([
            'message' => 'Images added successfully! ' . count($savedImages) . ' image(s) saved.',
            'images'  => $savedImages,
        ], 201);
    }

    /**
     * Delete an image from a daily update
     */
    public function deleteDailyUpdateImage(Request $request, string $token, $imageId)
    {
        $site = SolarSite::where('supervisor_token', $token)->where('is_active', true)->first();
        if (!$site) {
            return response()->json(['message' => 'Invalid or expired upload link.'], 404);
        }

        $image = \App\Models\SolarDailyUpdateImage::whereHas('dailyUpdate.project', function($q) use ($site) {
            $q->where('solar_site_id', $site->id);
        })->find($imageId);

        if (!$image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        $path = storage_path('app/public/' . $image->image_path);
        if (file_exists($path)) {
            unlink($path);
        }
        $image->delete();

        return response()->json(['message' => 'Image deleted successfully.']);
    }
}