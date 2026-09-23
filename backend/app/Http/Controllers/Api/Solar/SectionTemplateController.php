<?php

namespace App\Http\Controllers\Api\Solar;

use App\Http\Controllers\Controller;
use App\Models\SectionTemplate;
use Illuminate\Http\Request;

class SectionTemplateController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || ($user->role !== 'super_admin' && !$user->hasRole('super_admin'))) {
                abort(403, 'Unauthorized. Super Admin access required.');
            }
            return $next($request);
        });
    }

    public function index()
    {
        return response()->json(SectionTemplate::orderBy('sort_order')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'required|integer|min:1',
            'has_before_after' => 'boolean',
            'has_table_tracking' => 'boolean',
            'sub_sections' => 'nullable|array',
            'sub_sections.*' => 'string|max:255',
            'expected_images' => 'required|integer|min:1',
            'notes' => 'nullable|string'
        ]);

        $template = SectionTemplate::create($validated);
        return response()->json(['message' => 'Template created successfully', 'data' => $template], 201);
    }

    public function show(SectionTemplate $template)
    {
        return response()->json($template);
    }

    public function update(Request $request, SectionTemplate $template)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'required|integer|min:1',
            'has_before_after' => 'boolean',
            'has_table_tracking' => 'boolean',
            'sub_sections' => 'nullable|array',
            'sub_sections.*' => 'string|max:255',
            'expected_images' => 'required|integer|min:1',
            'notes' => 'nullable|string'
        ]);

        $template->update($validated);
        return response()->json(['message' => 'Template updated successfully', 'data' => $template]);
    }

    public function destroy(SectionTemplate $template)
    {
        $template->delete();
        return response()->json(['message' => 'Template deleted successfully']);
    }
}
