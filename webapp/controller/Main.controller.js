sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/DatePicker",
    "sap/m/TextArea",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/ui/layout/form/SimpleForm"
], (Controller, Filter, FilterOperator, MessageBox, UIComponent, Dialog, Button, Label, Input, DatePicker, TextArea, Select, Item, Toolbar, ToolbarSpacer, SimpleForm) => {
    "use strict";

    return Controller.extend("bcui04.controller.Main", {
        onInit() {
            this._updateTableTitle(0);

            // Subscribe to the event bus for refresh notifications
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.subscribe("bcui04", "refreshMainView", this._onRefreshMainView, this);

            // Initialize the Create Purchase Request Dialog
            this._initCreatePurchaseReqDialog();
        },

        _initCreatePurchaseReqDialog: function () {
            this._oCreateDialog = new Dialog({
                title: "{i18n>createPurchaseReqTitle}",
                content: new SimpleForm({
                    content: [
                        new Label({ text: "{i18n>requester}", required: true }),
                        new Input({ id: this.createId("newRequesterInput") }),
                        new Label({ text: "{i18n>requestDate}", required: true }),
                        new DatePicker({ id: this.createId("newReqDatePicker") }),
                        new Label({ text: "{i18n>comment}" }),
                        new TextArea({ id: this.createId("newCommentInput"), rows: 4 }),
                        new Label({ text: "{i18n>approved}" }),
                        new Select({
                            id: this.createId("newApproveYNSelect"),
                            forceSelection: false,
                            items: [
                                new Item({ key: "true", text: "{i18n>yes}" }),
                                new Item({ key: "false", text: "{i18n>no}" })
                            ]
                        })
                    ]
                }),
                beginButton: new Button({
                    text: "{i18n>save}",
                    press: this.onSavePress.bind(this)
                }),
                endButton: new Button({
                    text: "{i18n>cancel}",
                    press: function () {
                        this._oCreateDialog.close();
                    }.bind(this)
                }),
                customHeader: new Toolbar({
                    content: [
                        new ToolbarSpacer(),
                        new Button({
                            icon: "sap-icon://decline",
                            press: function () {
                                this._oCreateDialog.close();
                            }.bind(this)
                        })
                    ]
                })
            });

            this.getView().addDependent(this._oCreateDialog);
        },

        onNewPress() {
            // Reset all fields to their default values
            this.byId("newRequesterInput").setValue("");
            this.byId("newReqDatePicker").setDateValue(new Date()); // Set the default date to today
            this.byId("newCommentInput").setValue("");
            this.byId("newApproveYNSelect").setSelectedKey(false);

            this._oCreateDialog.open();
        },

        onSavePress: function () {
            const oRequesterInput = this.byId("newRequesterInput");
            const oDatePicker = this.byId("newReqDatePicker");

            if (!oRequesterInput.getValue()) {
                MessageBox.error("Requester is mandatory.");
                return;
            }

            if (!oDatePicker.getDateValue()) {
                MessageBox.error("Request Date is mandatory.");
                return;
            }

            const oModel = this.getView().getModel();
            const oNewEntry = {
                requester: oRequesterInput.getValue(),
                reqDate: this._formatDate(oDatePicker.getDateValue()),
                comment: this.byId("newCommentInput").getValue(),
                approveYN: this.byId("newApproveYNSelect").getSelectedKey() === "true"
            };

            // Create a new entry in the OData V4 model
            const oListBinding = oModel.bindList("/PurchaseReq");
            const oContext = oListBinding.create(oNewEntry);

            oContext.created().then(() => {
                MessageBox.success("Purchase request created successfully.");
                this._oCreateDialog.close();
                this._onRefreshMainView();
            }).catch(() => {
                MessageBox.error("Failed to create purchase request.");
            });
        },

        _formatDate: function (oDate) {
            if (!oDate) {
                return null;
            }
            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, '0');
            const day = String(oDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        _onRefreshMainView: function () {
            const oTable = this.byId("purchaseReqTable");
            const oBinding = oTable.getBinding("items");
            oBinding.refresh();
        },

        onSearch(oEvent) {
            const oTable = this.byId("purchaseReqTable");
            const oBinding = oTable.getBinding("items");
            const oFilterBar = this.byId("filterBar");
            const aFilters = [];

            oTable.setBusy(true);

            const aFilterItems = oFilterBar.getAllFilterItems();
            aFilterItems.forEach(oFilterItem => {
                const sName = oFilterItem.getName();
                const oControl = oFilterItem.getControl();
                const sValue = oControl.getValue ? oControl.getValue() : oControl.getSelectedKey();

                if (sValue) {
                    switch (sName) {
                        case "requester":
                            aFilters.push(new Filter("requester", FilterOperator.Contains, sValue));
                            break;
                        case "reqDate":
                            aFilters.push(new Filter("reqDate", FilterOperator.EQ, sValue));
                            break;
                        case "approveYN":
                            if (sValue !== "") {
                                aFilters.push(new Filter("approveYN", FilterOperator.EQ, sValue === "true"));
                            }
                            break;
                        default:
                            break;
                    }
                }
            });

            oBinding.filter(aFilters, "Application");

            oBinding.attachEventOnce("dataReceived", (oEvent) => {
                oTable.setBusy(false);
                const iCount = oEvent.getParameter("data").value.length;
                this._updateTableTitle(iCount);
            });

            if (aFilters.length === 0) {
                oTable.setBusy(false);
            }
        },

        onRemovePress() {
            const oTable = this.byId("purchaseReqTable");
            const aSelectedItems = oTable.getSelectedItems();
            const oModel = this.getView().getModel();

            if (aSelectedItems.length > 0) {
                aSelectedItems.forEach(oItem => {
                    const oContext = oItem.getBindingContext();
                    const sPath = oContext.getPath();

                    oModel.delete(sPath).then(() => {
                        MessageBox.success("Item removed successfully.");
                    }).catch((oError) => {
                        MessageBox.error("Failed to remove item.");
                    });
                });
                oTable.removeSelections();
            } else {
                MessageBox.warning("No items selected for removal.");
            }
        },

        onItemPress: function (oEvent) {
            const oItem = oEvent.getSource();
            const oRouter = UIComponent.getRouterFor(this);
            const sPath = oItem.getBindingContext().getPath();
            const sPurchaseReqId = sPath.split("(")[1].split(")")[0];
            oRouter.navTo("RouteDetail", {
                purchaseReqId: sPurchaseReqId
            });
        },

        _updateTableTitle(iCount) {
            const oTitle = this.byId("tableTitle");
            oTitle.setText(`Purchase Req (${iCount})`);
        }
    });
});