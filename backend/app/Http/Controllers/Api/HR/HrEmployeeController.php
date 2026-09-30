<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class HrEmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = HrEmployee::with(['department', 'designation', 'manager'])
            ->orderBy('full_name');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sq) =>
                $sq->where('full_name', 'like', "%{$q}%")
                   ->orWhere('employee_id', 'like', "%{$q}%")
                   ->orWhere('company_email', 'like', "%{$q}%")
                   ->orWhere('phone', 'like', "%{$q}%")
            );
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name'                 => 'required|string|max:255',
            'department_id'             => 'required|exists:hr_departments,id',
            'designation_id'            => 'required|exists:hr_designations,id',
            'manager_id'                => 'nullable|exists:hr_employees,id',
            'nic'                       => 'nullable|string|max:20',
            'dob'                       => 'nullable|date',
            'gender'                    => 'nullable|in:male,female,other',
            'phone'                     => 'nullable|string|max:20',
            'personal_email'            => 'nullable|email|max:255',
            'company_email'             => 'nullable|email|max:255|unique:hr_employees,company_email',
            'address'                   => 'nullable|string',
            'emergency_contact_name'    => 'nullable|string|max:255',
            'emergency_contact_phone'   => 'nullable|string|max:20',
            'epf_no'                    => 'nullable|string|max:50',
            'employment_type'           => 'required|in:permanent,part_time,fixed_term_contract,intern,consultant',
            'joined_date'               => 'required|date',
            'probation_end_date'        => 'nullable|date',
            'work_location'             => 'nullable|string|max:50',
            'status'                    => 'required|in:active,probation,on_leave,resigned,terminated',
            'basic_salary'              => 'nullable|numeric|min:0',
            'photo'                     => 'nullable|image|max:2048',
            // User account
            'create_user_account'       => 'nullable|boolean',
            'user_password'             => 'nullable|string|min:8',
        ]);

        // Handle photo upload
        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('hr/photos', 'public');
        }

        // Auto employee ID
        $employeeId = HrEmployee::generateEmployeeId();

        $employee = HrEmployee::create(array_merge(
            collect($validated)->except(['create_user_account', 'user_password', 'photo'])->toArray(),
            ['employee_id' => $employeeId, 'photo' => $photoPath]
        ));

        // Create linked user account
        if ($request->boolean('create_user_account') && $request->filled('user_password')) {
            $loginEmail = $validated['company_email'] ?? $validated['personal_email'];
            if ($loginEmail) {
                $user = User::create([
                    'name'     => $validated['full_name'],
                    'email'    => $loginEmail,
                    'password' => Hash::make($validated['user_password']),
                    'force_password_change' => true,
                ]);
                $role = Role::where('name', 'solar_employee')->first();
                if ($role) $user->assignRole($role);

                $employee->update(['user_id' => $user->id]);
            }
        }

        $employee->load(['department', 'designation', 'manager']);

        return response()->json(['message' => 'Employee created', 'data' => $employee], 201);
    }

    public function show(HrEmployee $hrEmployee)
    {
        $hrEmployee->load(['department', 'designation', 'manager', 'user']);
        return response()->json($hrEmployee);
    }

    public function update(Request $request, HrEmployee $hrEmployee)
    {
        $validated = $request->validate([
            'full_name'                 => 'sometimes|required|string|max:255',
            'department_id'             => 'sometimes|required|exists:hr_departments,id',
            'designation_id'            => 'sometimes|required|exists:hr_designations,id',
            'manager_id'                => 'nullable|exists:hr_employees,id',
            'nic'                       => 'nullable|string|max:20',
            'dob'                       => 'nullable|date',
            'gender'                    => 'nullable|in:male,female,other',
            'phone'                     => 'nullable|string|max:20',
            'personal_email'            => 'nullable|email|max:255',
            'company_email'             => 'nullable|email|max:255|unique:hr_employees,company_email,' . $hrEmployee->id,
            'address'                   => 'nullable|string',
            'emergency_contact_name'    => 'nullable|string|max:255',
            'emergency_contact_phone'   => 'nullable|string|max:20',
            'epf_no'                    => 'nullable|string|max:50',
            'employment_type'           => 'nullable|in:permanent,part_time,fixed_term_contract,intern,consultant',
            'joined_date'               => 'nullable|date',
            'probation_end_date'        => 'nullable|date',
            'work_location'             => 'nullable|string|max:50',
            'status'                    => 'nullable|in:active,probation,on_leave,resigned,terminated',
            'basic_salary'              => 'nullable|numeric|min:0',
            'photo'                     => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            if ($hrEmployee->photo) Storage::disk('public')->delete($hrEmployee->photo);
            $validated['photo'] = $request->file('photo')->store('hr/photos', 'public');
        }

        $hrEmployee->update($validated);
        $hrEmployee->load(['department', 'designation', 'manager']);

        return response()->json(['message' => 'Employee updated', 'data' => $hrEmployee]);
    }

    public function destroy(Request $request, HrEmployee $hrEmployee)
    {
        if (!$request->user()->hasRole('super_admin')) {
            return response()->json(['message' => 'Only Super Admin can delete employees.'], 403);
        }
        
        $hrEmployee->delete();
        return response()->json(['message' => 'Employee deleted']);
    }

    // ── Employee: View own profile ────────────────────────────────────────────
    public function me(Request $request)
    {
        $employee = HrEmployee::with(['department', 'designation'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$employee) return response()->json(['message' => 'Employee profile not found'], 404);
        return response()->json($employee);
    }

    // ── Employee: Self-update limited fields ──────────────────────────────────
    public function selfUpdate(Request $request, $id)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'phone'                   => 'nullable|string|max:30',
            'address'                 => 'nullable|string|max:500',
            'emergency_contact_name'  => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:30',
        ]);

        $employee->update($validated);
        return response()->json(['message' => 'Profile updated', 'data' => $employee]);
    }
}
