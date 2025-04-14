sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("bcui04.controller.Detail", {
        onInit: function () {
            const oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);

            // Initialize edit mode model
            const oEditModel = new JSONModel({ editMode: false });
            this.getView().setModel(oEditModel, "edit");
        },

        _onObjectMatched: function (oEvent) {
            const sPurchaseReqId = oEvent.getParameter("arguments").purchaseReqId;
            const oModel = this.getView().getModel();
            oModel.resetChanges("myUpdateGroup");

            this.getView().bindElement({
                path: `/PurchaseReq(${sPurchaseReqId})`,
                parameters: {
                    expand: "items",
                    $$updateGroupId: "myUpdateGroup"
                }
            });
        },

        onEditPress: function () {
            const oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/editMode", true);
        },

        onSavePress: function () {
            const oRequesterInput = this.byId("requesterInput");
            const oDatePicker = this.byId("reqDatePicker");

            if (!oRequesterInput.getValue()) {
                MessageBox.error("Requester is mandatory.");
                return;
            }

            if (!oDatePicker.getDateValue()) {
                MessageBox.error("Request Date is mandatory.");
                return;
            }

            const oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/editMode", false);

            // Save changes using OData V4 submitBatch method
            const oModel = this.getView().getModel();
            oModel.submitBatch("myUpdateGroup").then(() => {
                MessageBox.success("Changes saved successfully.");
            }).catch((oError) => {
                MessageBox.error("Failed to save changes.");
            });
        },

        onCancelPress: function () {
            const oEditModel = this.getView().getModel("edit");
            oEditModel.setProperty("/editMode", false);

            // Revert changes using OData V4 resetChanges method
            const oModel = this.getView().getModel();
            oModel.resetChanges("myUpdateGroup");

            MessageBox.information("Changes canceled.");
        },

        onAddItemPress: function () {
            const oModel = this.getView().getModel();
            const oListBinding = this.getView().byId("purchaseReqItemTable").getBinding("items");

            // Create a new item in the PurchaseReqItem entity set
            oListBinding.create({
                itemID: "", // Initialize with default values
                reqQuantity: 0,
                unitOfMeasure: ""
            }, {
                groupId: "myUpdateGroup",
                success: () => {
                    MessageBox.success("New item added successfully.");
                },
                error: (oError) => {
                    MessageBox.error("Failed to add new item.");
                }
            });
        },

        onRemoveItemPress: function () {
            const oTable = this.byId("purchaseReqItemTable");
            const aSelectedItems = oTable.getSelectedItems();
            const oModel = this.getView().getModel();

            if (aSelectedItems.length > 0) {
                aSelectedItems.forEach(oItem => {
                    const oContext = oItem.getBindingContext();
                    oContext.delete("myUpdateGroup").then(() => {
                        MessageBox.success("Item removed successfully.");
                    }).catch((oError) => {
                        MessageBox.error("Failed to remove item.");
                    });
                });
                oTable.removeSelections();
            } else {
                MessageBox.warning("No items selected for removal.");
            }
        }
    });
});