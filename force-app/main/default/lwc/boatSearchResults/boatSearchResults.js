import { api, LightningElement, track, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import getBoats from '@salesforce/apex/BoatDataService.getBoats'
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList'
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { refreshApex } from '@salesforce/apex';


// ...
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT = 'Ship it!';
const SUCCESS_VARIANT = 'success';
const ERROR_TITLE = 'Error';
const ERROR_VARIANT = 'error';

export default class BoatSearchResults extends LightningElement {
    @api
    selectedBoatId;
    columns =
        [{ label: 'Name', fieldName: 'Name', editable: true },
        { label: 'Length', fieldName: 'Length__c', type: 'number' },
        { label: 'Price', fieldName: 'Price__c', type: 'currency' },
        { label: 'Description', fieldName: 'Description__c' }];
    boatTypeId = '';
    @track
    boats;
    isLoading = false;

    // wired message context
    @wire(MessageContext)
    messageContext;

    // wired getBoats method 
    @wire(getBoats, { boatTypeId: '$boatTypeId' })
    wiredBoats(result) {
        this.boats = result;
        //console.log(JSON.stringify(result));
        // if (result.data) {
        //     this.boats = result.data;
        // }
        // else if (result.error) {
        //     const evt = new ShowToastEvent({
        //         title: ERROR_TITLE,
        //         variant: ERROR_VARIANT,
        //     });
        //     this.dispatchEvent(evt);
        // }
    }

    // public function that updates the existing boatTypeId property
    // uses notifyLoading
    @api
    searchBoats(boatTypeId) {
        this.isLoading = true;
        this.notifyLoading(this.isLoading);
        this.boatTypeId = boatTypeId;
    }

    // this public function must refresh the boats asynchronously
    // uses notifyLoading
    @api
    async refresh() {
        this.isLoading = true;
        this.notifyLoading(this.isLoading);
        await refreshApex(this.boats);
        this.isLoading = false;
        this.notifyLoading(this.isLoading);
    }

    // this function must update selectedBoatId and call sendMessageService
    updateSelectedTile(event) {
        const newBoatId = event.detail.boatId;
        this.selectedBoatId = newBoatId;
        this.sendMessageService(this.selectedBoatId)
    }

    // Publishes the selected boat Id on the BoatMC.
    sendMessageService(boatId) {
        const payload = { recordId: boatId };
        publish(this.messageContext, BOATMC, payload);
        // explicitly pass boatId to the parameter recordId
    }

    // The handleSave method must save the changes in the Boat Editor
    // passing the updated fields from draftValues to the 
    // Apex method updateBoatList(Object data).
    // Show a toast message with the title
    // clear lightning-datatable draft values
    handleSave(event) {
        // notify loading
        this.notifyLoading(true)
        const updatedFields = event.detail.draftValues;
        // Update the records via Apex
        updateBoatList({ data: updatedFields })
            .then(() => {
                const evt = new ShowToastEvent({
                    title: SUCCESS_TITLE,
                    message: MESSAGE_SHIP_IT,
                    variant: SUCCESS_VARIANT,
                });
                this.dispatchEvent(evt);
                return this.refresh();
            })
            .catch(error => {
                console.log(JSON.stringify(error));
                const evt = new ShowToastEvent({
                    title: ERROR_TITLE,
                    variant: ERROR_VARIANT,
                });
                this.dispatchEvent(evt);
            })
            .finally(() => {
                this.notifyLoading(false)
            });
    }
    // Check the current value of isLoading before dispatching the doneloading or loading custom event
    notifyLoading(isLoading) {
        const loadingEvent = new CustomEvent(isLoading ? 'loading' : 'doneloading')
        this.dispatchEvent(loadingEvent);
    }
}
