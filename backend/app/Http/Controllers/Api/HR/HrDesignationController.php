<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrDesignation;
use Illuminate\Http\Request;

class HrDesignationController extends Controller
{
    public function index(Request $request)
    {
        $query = HrDesignation::with('department')
            ->withCount([
                'employees as employee_count' => fn($q) => $q->whereIn('status', ['active', 'probation', 'on_leave'])
            ]);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        return response()->json($query->orderBy('title')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'         => 'required|string|max:255',
            'department_id' => 'required|exists:hr_departments,id',
            'level'         => 'required|in:Junior,Mid,Senior,Lead,C_Level',
        ]);

        $designation = HrDesignation::create($validated);
        $designation->load('department');

        return response()->json(['message' => 'Designation created', 'data' => $designation], 201);
    }

    public function show(HrDesignation $hrDesignation)
    {
        $hrDesignation->load('department');
        return response()->json($hrDesignation);
    }

    public function update(Request $request, HrDesignation $hrDesignation)
    {
        $validated = $request->validate([
            'title'         => 'sometimes|required|string|max:255',
            'department_id' => 'sometimes|required|exists:hr_departments,id',
            'level'         => 'sometimes|required|in:Junior,Mid,Senior,Lead,C_Level',
        ]);

        $hrDesignation->update($validated);
        $hrDesignation->load('department');
        return response()->json(['message' => 'Designation updated', 'data' => $hrDesignation]);
    }

    public function destroy(HrDesignation $hrDesignation)
    {
        $count = $hrDesignation->employees()
            ->whereIn('status', ['active', 'probation', 'on_leave'])
            ->count();

        if ($count > 0) {
            return response()->json(['message' => 'Cannot delete: employees hold this designation.'], 422);
        }

        $hrDesignation->delete();
        return response()->json(['message' => 'Designation deleted']);
    }
}
