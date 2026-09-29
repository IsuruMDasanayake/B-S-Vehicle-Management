<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployeeDocument;
use App\Models\HrEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HrEmployeeDocumentController extends Controller
{
    public function index(Request $request, $employee_id)
    {
        $docs = HrEmployeeDocument::where('hr_employee_id', $employee_id)->orderBy('upload_date', 'desc')->get();
        // Add URL for each doc
        foreach ($docs as $doc) {
            $doc->file_url = asset('storage/' . $doc->file_path);
        }
        return response()->json($docs);
    }

    public function store(Request $request, $employee_id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:10240', // 10MB max
            'upload_date' => 'required|date',
        ]);

        $employee = HrEmployee::findOrFail($employee_id);

        $path = $request->file('file')->store('hr/documents/' . $employee->id, 'public');

        $doc = HrEmployeeDocument::create([
            'hr_employee_id' => $employee->id,
            'title' => $validated['title'],
            'file_path' => $path,
            'upload_date' => $validated['upload_date'],
        ]);

        $doc->file_url = asset('storage/' . $doc->file_path);

        return response()->json(['message' => 'Document uploaded', 'data' => $doc], 201);
    }

    public function update(Request $request, $employee_id, $id)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'upload_date' => 'sometimes|required|date',
        ]);

        $doc = HrEmployeeDocument::where('hr_employee_id', $employee_id)->findOrFail($id);
        $doc->update($validated);
        
        $doc->file_url = asset('storage/' . $doc->file_path);

        return response()->json(['message' => 'Document updated', 'data' => $doc]);
    }

    public function destroy($employee_id, $id)
    {
        $doc = HrEmployeeDocument::where('hr_employee_id', $employee_id)->findOrFail($id);
        
        if (Storage::disk('public')->exists($doc->file_path)) {
            Storage::disk('public')->delete($doc->file_path);
        }
        
        $doc->delete();
        return response()->json(['message' => 'Document deleted']);
    }
}
