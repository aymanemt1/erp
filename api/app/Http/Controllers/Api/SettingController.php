<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SettingsRequest;
use App\Models\Setting;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json(Setting::allKeyed());
    }

    public function update(SettingsRequest $request)
    {
        foreach ($request->validated() as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(Setting::allKeyed());
    }
}
