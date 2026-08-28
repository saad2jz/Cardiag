package com.cardiag.online;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothSerial",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.ACCESS_FINE_LOCATION },
            alias = "bluetooth"
        )
    }
)
public class BluetoothSerialPlugin extends Plugin {

    // Standard SPP UUID
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private InputStream inputStream;
    private OutputStream outputStream;
    private final List<BluetoothDevice> discoveredDevices = new ArrayList<>();
    private BroadcastReceiver discoveryReceiver;

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void listBondedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.resolve(new JSObject().put("devices", new JSArray()));
            return;
        }

        try {
            Set<BluetoothDevice> bonded = bluetoothAdapter.getBondedDevices();
            JSArray arr = new JSArray();
            if (bonded != null) {
                for (BluetoothDevice dev : bonded) {
                    JSObject d = new JSObject();
                    d.put("name", dev.getName() != null ? dev.getName() : "Inconnu");
                    d.put("address", dev.getAddress());
                    arr.put(d);
                }
            }
            JSObject res = new JSObject();
            res.put("devices", arr);
            call.resolve(res);
        } catch (SecurityException e) {
            call.reject("Permission Bluetooth requise", e);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.resolve();
            return;
        }

        discoveredDevices.clear();
        if (discoveryReceiver != null) {
            try {
                getContext().unregisterReceiver(discoveryReceiver);
            } catch (Exception ignored) {}
        }

        discoveryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device != null && !discoveredDevices.contains(device)) {
                        discoveredDevices.add(device);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_FOUND);
        getContext().registerReceiver(discoveryReceiver, filter);

        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            bluetoothAdapter.startDiscovery();
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Permission Bluetooth requise", e);
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (bluetoothAdapter != null) {
            try {
                bluetoothAdapter.cancelDiscovery();
            } catch (SecurityException ignored) {}
        }
        if (discoveryReceiver != null) {
            try {
                getContext().unregisterReceiver(discoveryReceiver);
                discoveryReceiver = null;
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void getDiscoveredDevices(PluginCall call) {
        JSArray arr = new JSArray();
        try {
            for (BluetoothDevice dev : discoveredDevices) {
                JSObject d = new JSObject();
                d.put("name", dev.getName() != null ? dev.getName() : "Inconnu");
                d.put("address", dev.getAddress());
                arr.put(d);
            }
        } catch (SecurityException ignored) {}
        JSObject res = new JSObject();
        res.put("devices", arr);
        call.resolve(res);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Adresse Bluetooth requise");
            return;
        }

        if (bluetoothAdapter == null) {
            call.reject("Bluetooth indisponible");
            return;
        }

        new Thread(() -> {
            try {
                if (bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                disconnectInternal();

                bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                bluetoothSocket.connect();
                inputStream = bluetoothSocket.getInputStream();
                outputStream = bluetoothSocket.getOutputStream();

                call.resolve();
            } catch (Exception e) {
                disconnectInternal();
                call.reject("Erreur de connexion SPP : " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        call.resolve();
    }

    private void disconnectInternal() {
        try {
            if (inputStream != null) inputStream.close();
        } catch (Exception ignored) {}
        try {
            if (outputStream != null) outputStream.close();
        } catch (Exception ignored) {}
        try {
            if (bluetoothSocket != null) bluetoothSocket.close();
        } catch (Exception ignored) {}
        inputStream = null;
        outputStream = null;
        bluetoothSocket = null;
    }

    @PluginMethod
    public void write(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Données requises");
            return;
        }

        if (outputStream == null) {
            call.reject("Non connecté");
            return;
        }

        try {
            outputStream.write(data.getBytes(StandardCharsets.US_ASCII));
            outputStream.flush();
            call.resolve();
        } catch (Exception e) {
            call.reject("Erreur d'écriture : " + e.getMessage());
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        if (inputStream == null) {
            call.reject("Non connecté");
            return;
        }

        try {
            int available = inputStream.available();
            if (available > 0) {
                byte[] buffer = new byte[available];
                int read = inputStream.read(buffer);
                if (read > 0) {
                    String str = new String(buffer, 0, read, StandardCharsets.US_ASCII);
                    JSObject res = new JSObject();
                    res.put("data", str);
                    call.resolve(res);
                    return;
                }
            }
            JSObject res = new JSObject();
            res.put("data", "");
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Erreur de lecture : " + e.getMessage());
        }
    }
}
