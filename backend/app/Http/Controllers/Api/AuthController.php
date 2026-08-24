<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Account is inactive or suspended'], 403);
        }

        // Allow multiple sessions (laptop + mobile) by NOT deleting existing tokens
        // $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = clone $request->user();
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'driver', // Default to driver if it's a driver model
                'roles' => method_exists($user, 'getRoleNames') ? $user->getRoleNames() : ['driver'],
                'permissions' => method_exists($user, 'getAllPermissions') ? $user->getAllPermissions()->pluck('name') : [],
            ]
        ]);
    }

    public function driverLogin(Request $request)
    {
        $request->validate([
            'contact_number' => 'required|string',
        ]);

        $driver = \App\Models\Driver::where('contact_number', $request->contact_number)->first();

        if (!$driver) {
            return response()->json(['message' => 'Driver not found with this mobile number'], 404);
        }

        if ($driver->status !== 'active') {
            return response()->json(['message' => 'Driver account is inactive'], 403);
        }

        // Generate a token for the Driver model
        $token = $driver->createToken('driver_auth_token', ['role:driver'])->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'token' => $token,
            'user' => [
                'id' => $driver->id,
                'name' => $driver->name,
                'email' => $driver->contact_number, // Fallback for email field
                'role' => 'driver',
            ]
        ]);
    }
}
