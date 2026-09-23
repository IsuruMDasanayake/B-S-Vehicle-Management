<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarSection;
use App\Models\SolarUploadBatch;
use App\Models\SolarImage;
use Illuminate\Http\Request;

class SolarUploadBatchController extends Controller
{
    public function index(Request $request)
    {
        $query = SolarUploadBatch::with(['images', 'section.project.site']);

        if ($request->filled('section_id')) {
            $query->where('solar_section_id', $request->section_id);
        }

        return response()->json($query->orderByDesc('work_date')->get());
    }

    public function show(SolarUploadBatch $solarUploadBatch)
    {
        $solarUploadBatch->load(['images', 'section.project.site']);
        return response()->json($solarUploadBatch);
    }

    public function update(Request $request, SolarUploadBatch $solarUploadBatch)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
            abort(403, 'Unauthorized. Super Admin access required.');
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

        $solarUploadBatch->update($validated);
        return response()->json(['message' => 'Batch updated successfully', 'data' => $solarUploadBatch]);
    }

    public function destroy(Request $request, SolarUploadBatch $solarUploadBatch)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }

        // Delete images from disk
        foreach ($solarUploadBatch->images as $image) {
            if (file_exists(storage_path('app/public/' . $image->image_path))) {
                unlink(storage_path('app/public/' . $image->image_path));
            }
        }
        $solarUploadBatch->delete();
        return response()->json(['message' => 'Batch deleted']);
    }

    public function addImages(Request $request, SolarUploadBatch $solarUploadBatch)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }

        $request->validate([
            'images'            => 'required|array|min:1|max:30',
            'images.*'          => 'required|image|mimes:jpeg,jpg,png,heic|max:20480',
        ]);

        // Need the site ID to build the path
        $solarUploadBatch->load('section.project');
        $siteId = $solarUploadBatch->section->project->solar_site_id;

        $savedImages = [];

        foreach ($request->file('images') as $file) {
            $dateFolder = now()->format('Y-m-d');
            $folder     = "solar-images/site-{$siteId}/{$dateFolder}";
            $filename   = uniqid('img_', true) . '.jpg';
            $relativePath = "{$folder}/{$filename}";
            $fullPath     = storage_path("app/public/{$relativePath}");

            if (!is_dir(dirname($fullPath))) {
                mkdir(dirname($fullPath), 0755, true);
            }

            \Intervention\Image\ImageManagerStatic::make($file->getRealPath())
                ->resize(1920, null, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                })
                ->encode('jpg', 80)
                ->save($fullPath);

            $fileSize = filesize($fullPath);
            $publicUrl = url("storage/{$relativePath}");

            $image = SolarImage::create([
                'solar_upload_batch_id' => $solarUploadBatch->id,
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
}
