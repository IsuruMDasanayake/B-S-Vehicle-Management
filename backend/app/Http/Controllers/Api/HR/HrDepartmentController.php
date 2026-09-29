<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrDepartment;
use Illuminate\Http\Request;

class HrDepartmentController extends Controller
{
    public function index()
    {
        $departments = HrDepartment::withCount([
            'employees as employee_count' => fn($q) => $q->whereIn('status', ['active', 'probation', 'on_leave'])
        ])->orderBy('name')->get();

        return response()->json($departments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255|unique:hr_departments,name',
            'description' => 'nullable|string|max:500',
        ]);

        $dept = HrDepartment::create($validated);

        return response()->json(['message' => 'Department created', 'data' => $dept], 201);
    }

    public function show(HrDepartment $hrDepartment)
    {
        $hrDepartment->loadCount([
            'employees as employee_count' => fn($q) => $q->whereIn('status', ['active', 'probation', 'on_leave'])
        ]);
        return response()->json($hrDepartment);
    }

    public function update(Request $request, HrDepartment $hrDepartment)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255|unique:hr_departments,name,' . $hrDepartment->id,
            'description' => 'nullable|string|max:500',
        ]);

        $hrDepartment->update($validated);
        return response()->json(['message' => 'Department updated', 'data' => $hrDepartment]);
    }

    public function destroy(HrDepartment $hrDepartment)
    {
        $activeCount = $hrDepartment->employees()
            ->whereIn('status', ['active', 'probation', 'on_leave'])
            ->count();

        if ($activeCount > 0) {
            return response()->json(['message' => 'Cannot delete: department has active employees.'], 422);
        }

        $hrDepartment->delete();
        return response()->json(['message' => 'Department deleted']);
    }
}
