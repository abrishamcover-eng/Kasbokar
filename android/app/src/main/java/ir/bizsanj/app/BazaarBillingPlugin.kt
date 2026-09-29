package ir.bizsanj.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.request.PurchaseRequest

@CapacitorPlugin(name = "BazaarBilling")
class BazaarBillingPlugin : Plugin() {
    private var payment: Payment? = null
    private var connection: Connection? = null
    private val defaultProductId = "bizsanj_growth_yearly"

    private fun connectedPayment(): Payment {
        val current = payment
        if (current != null && connection != null) return current
        val created = Payment(
            context = bridge.activity,
            config = PaymentConfiguration(
                localSecurityCheck = SecurityCheck.Disable,
                shouldSupportSubscription = true
            )
        )
        payment = created
        connection = created.connect {
            connectionSucceed { }
            connectionFailed { }
        }
        return created
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val productId = call.getString("productId", defaultProductId) ?: defaultProductId
        try {
            connectedPayment().getSubscribedProducts {
                querySucceed { products ->
                    val active = products.any { it.productId == productId }
                    call.resolve(status(active, productId, "bazaar"))
                }
                queryFailed { error -> call.reject(error.message ?: "بازخوانی اشتراک بازار انجام نشد") }
            }
        } catch (error: Exception) {
            call.reject(error.message ?: "بازار روی دستگاه در دسترس نیست")
        }
    }

    @PluginMethod
    fun restore(call: PluginCall) {
        getStatus(call)
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val productId = call.getString("productId", defaultProductId) ?: defaultProductId
        try {
            connectedPayment().subscribeProduct(
                bridge.activity.activityResultRegistry,
                PurchaseRequest(productId = productId),
            ) {
                purchaseSucceed { purchase ->
                    val result = JSObject()
                    result.put("entitled", true)
                    result.put("productId", purchase.productId)
                    result.put("purchaseToken", purchase.purchaseToken)
                    result.put("orderId", purchase.orderId)
                    call.resolve(result)
                }
                purchaseCanceled { call.reject("خرید لغو شد") }
                purchaseFailed { error -> call.reject(error.message ?: "خرید ناموفق بود") }
                failedToBeginFlow { error -> call.reject(error.message ?: "شروع پرداخت ناموفق بود") }
            }
        } catch (error: Exception) {
            call.reject(error.message ?: "پرداخت بازار در دسترس نیست")
        }
    }

    private fun status(entitled: Boolean, productId: String, source: String): JSObject {
        val result = JSObject()
        result.put("available", true)
        result.put("entitled", entitled)
        result.put("productId", productId)
        result.put("source", source)
        return result
    }

    override fun handleOnDestroy() {
        connection?.disconnect()
        connection = null
        payment = null
        super.handleOnDestroy()
    }
}
