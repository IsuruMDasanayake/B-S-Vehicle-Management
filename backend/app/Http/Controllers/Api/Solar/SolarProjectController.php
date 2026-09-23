<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SolarProject;
use App\Models\SolarSection;
use App\Models\SolarProjectTable;
use App\Models\SectionTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolarProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = SolarProject::with('site')->withCount('sections');

        if ($request->filled('site_id')) {
            $query->where('solar_site_id', $request->site_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'solar_site_id'          => 'required|exists:solar_sites,id',
            'name'                   => 'required|string|max:255',
            'client_name'            => 'nullable|string|max:255',
            'status'                 => 'in:active,completed,on_hold',
            'start_date'             => 'nullable|date',
            'expected_completion'    => 'nullable|date',
            'assigned_supervisors'   => 'nullable|array',
            'notes'                  => 'nullable|string',
            'table_config'           => 'nullable|array',
            'table_config.*.table_number' => 'required|integer|min:1',
            'table_config.*.panel_count'  => 'required|integer|in:14,28',
        ]);

        DB::beginTransaction();
        try {
            $project = SolarProject::create($validated);

            // Auto-populate sections from templates
            $templates = SectionTemplate::orderBy('sort_order')->get();
            foreach ($templates as $template) {
                SolarSection::create([
                    'solar_project_id'   => $project->id,
                    'name'               => $template->name,
                    'sort_order'         => $template->sort_order,
                    'has_before_after'   => $template->has_before_after,
                    'has_table_tracking' => $template->has_table_tracking,
                    'sub_sections'       => $template->sub_sections,
                    'expected_images'    => $template->expected_images,
                    'notes'              => $template->notes,
                ]);
            }

            // Save table config if provided
            if (!empty($validated['table_config'])) {
                foreach ($validated['table_config'] as $tableRow) {
                    SolarProjectTable::create([
                        'solar_project_id' => $project->id,
                        'table_number'     => $tableRow['table_number'],
                        'panel_count'      => $tableRow['panel_count'],
                    ]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Project created with sections', 'data' => $project->load('sections')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create project', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(SolarProject $project)
    {
        $project->load(['site', 'sections.uploadBatches.images', 'projectTables']);
        return response()->json($project);
    }

    public function update(Request $request, SolarProject $project)
    {
        $validated = $request->validate([
            'name'                 => 'sometimes|required|string|max:255',
            'client_name'          => 'nullable|string|max:255',
            'status'               => 'sometimes|in:active,completed,on_hold',
            'start_date'           => 'nullable|date',
            'expected_completion'  => 'nullable|date',
            'assigned_supervisors' => 'nullable|array',
            'notes'                => 'nullable|string',
        ]);

        $project->update($validated);
        return response()->json(['message' => 'Project updated', 'data' => $project]);
    }

    public function addMilestone(Request $request, SolarProject $project)
    {
        $validated = $request->validate([
            'section_template_id' => 'required|exists:section_templates,id',
            'insert_after_order'  => 'required|integer|min:0',
        ]);

        $template = SectionTemplate::findOrFail($validated['section_template_id']);
        
        DB::beginTransaction();
        try {
            // Shift subsequent milestones down
            SolarSection::where('solar_project_id', $project->id)
                ->where('sort_order', '>', $validated['insert_after_order'])
                ->increment('sort_order');

            // Create new milestone
            $newSection = SolarSection::create([
                'solar_project_id'   => $project->id,
                'name'               => $template->name,
                'sort_order'         => $validated['insert_after_order'] + 1,
                'has_before_after'   => $template->has_before_after,
                'has_table_tracking' => $template->has_table_tracking,
                'sub_sections'       => $template->sub_sections,
                'expected_images'    => $template->expected_images,
                'notes'              => $template->notes,
            ]);

            DB::commit();
            
            // Re-fetch project to return updated sections
            $project->load(['site', 'sections.uploadBatches.images', 'projectTables']);
            
            return response()->json([
                'message' => 'Milestone added successfully',
                'data' => $project
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to add milestone', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteMilestone(SolarSection $solarSection)
    {
        $user = auth()->user();
        if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        try {
            $solarSection->delete();
            return response()->json(['message' => 'Milestone deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete milestone', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(SolarProject $project)
    {
        $project->delete();
        return response()->json(['message' => 'Project deleted']);
    }
}
