<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarProject;
use App\Models\SolarDailyUpdate;
use App\Models\SolarDailyUpdateImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SolarDailyUpdateController extends Controller
{
    /**
     * Get all daily updates for a project.
     */
    public function index($projectId)
    {
        $project = SolarProject::findOrFail($projectId);
        
        $updates = SolarDailyUpdate::where('solar_project_id', $project->id)
            ->with('images')
            ->orderBy('report_date', 'desc')
            ->orderBy('start_time', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => $updates
        ]);
    }

    /**
     * Store a new daily update and handle images.
     */
    public function store(Request $request, $projectId)
    {
        $project = SolarProject::findOrFail($projectId);

        $validator = Validator::make($request->all(), [
            'report_date' => 'required|date',
            'start_time' => 'nullable',
            'manpower' => 'nullable|string',
            'machines' => 'nullable|string',
            'weather' => 'nullable|string',
            'planned_tasks' => 'nullable|string',
            'notes' => 'nullable|string',
            'images.*' => 'image|max:10240', // max 10MB per image
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $update = SolarDailyUpdate::create([
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
            $siteId = $project->solar_site_id;
            foreach ($request->file('images') as $file) {
                // Generate relative path: solar-images/sites/{site_id}/daily_updates/{date}
                $dirPath = "solar-images/sites/{$siteId}/daily_updates/" . $update->report_date->format('Y-m-d');
                $filename = Str::random(20) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs($dirPath, $filename, 'public');
                
                SolarDailyUpdateImage::create([
                    'solar_daily_update_id' => $update->id,
                    'image_path' => $path,
                    'image_url' => url('storage/' . $path),
                    'original_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Daily update submitted successfully',
            'data' => $update->load('images')
        ], 201);
    }

    /**
     * Delete a daily update and its images from storage.
     */
    public function destroy($id)
    {
        $update = SolarDailyUpdate::with('images')->findOrFail($id);

        foreach ($update->images as $image) {
            if (Storage::disk('public')->exists($image->image_path)) {
                Storage::disk('public')->delete($image->image_path);
            }
        }

        $update->delete();

        return response()->json([
            'message' => 'Daily update deleted successfully'
        ]);
    }

    /**
     * Update an existing daily update.
     */
    public function update(Request $request, $id)
    {
        $update = SolarDailyUpdate::findOrFail($id);

        $validated = $request->validate([
            'report_date' => 'sometimes|required|date',
            'start_time' => 'nullable',
            'manpower' => 'nullable|string',
            'machines' => 'nullable|string',
            'weather' => 'nullable|string',
            'planned_tasks' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $update->update($validated);

        return response()->json([
            'message' => 'Daily update modified successfully',
            'data' => $update
        ]);
    }
}
