import React, { useContext, useCallback, useState, useEffect } from 'react';
import { remote, shell } from 'electron';
import Path from 'path';
import { observer, Observer } from 'mobx-react-lite';
import { Button, H4, Collapse, Icon, Menu, MenuItem, Classes, Alert, Dialog, Label, ITreeNode, Tree, ContextMenu } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientLocation, DEFAULT_LOCATION_ID, IDirectoryTreeItem } from '../../../entities/Location';
import { ClientStringSearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';
import MultiTagSelector from '../../components/MultiTagSelector';
import { AppToaster } from '../../App';
import LocationStore from '../../stores/LocationStore';
import UiStore from '../../UiStore';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh directories'
}

// interface ILocationListItemProps {
//   dir: ClientLocation;
//   onDelete: (location: ClientLocation) => void;
//   onConfig: (location: ClientLocation) => void;
//   addToSearch: (path: string) => void;
//   replaceSearch: (path: string) => void;
// }

interface ILocationTreeProps {
  onDelete: (loc: ClientLocation) => void;
  onConfig: (loc: ClientLocation) => void;
}

const LocationTreeContextMenu = (
  { path, locationStore, uiStore, onDelete, onConfig }:
  { path: string, locationStore: LocationStore, uiStore: UiStore } & ILocationTreeProps
) => {
  const loc = locationStore.locationList.find((l) => l.path === path);
  const isLocation = loc !== undefined;
  const isImportLocation = loc?.id === DEFAULT_LOCATION_ID;

  const openDeleteDialog = useCallback(() => loc && onDelete(loc), [loc, onDelete]);
  const openConfigDialog = useCallback(() => loc && onConfig(loc), [loc, onConfig]);
  const handleOpenFileExplorer = useCallback(() => shell.openItem(path), [path]);

  const addToSearch = useCallback(() => {
    uiStore.addSearchCriteria(new ClientStringSearchCriteria<IFile>('path', path, 'contains'));
    uiStore.searchByQuery();
    uiStore.openSearch();
  }, [path, uiStore]);

  const replaceSearch = useCallback(() => {
    uiStore.clearSearchCriteriaList();
    addToSearch();
  }, [uiStore, addToSearch]);


  return (
    <Menu>
      <MenuItem text="Configure" onClick={openConfigDialog} icon={IconSet.SETTINGS} disabled={!loc} />
      <MenuItem onClick={addToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={replaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
      <MenuItem onClick={handleOpenFileExplorer} text="Open in File Browser" icon={IconSet.FOLDER_CLOSE} />
      <MenuItem text="Delete" onClick={openDeleteDialog} icon={IconSet.DELETE} disabled={!isLocation || isImportLocation} />
    </Menu>
  );
}

// @ContextMenuTarget
// class LocationListItem extends React.PureComponent<ILocationListItemProps> {
//   handleDelete= () => this.props.onDelete(this.props.dir);

//   openConfigDialog = () => this.props.onConfig(this.props.dir);

//   handleAddToSearch = () => this.props.addToSearch(this.props.dir.path);
//   handleReplaceSearch = () => this.props.replaceSearch(this.props.dir.path);

//   handleOpenFileExplorer = () => shell.openItem(this.props.dir.path);

//   render() {
//     const { dir } = this.props;
//     const isImportLocation = this.props.dir.id === DEFAULT_LOCATION_ID;
//     return (
//       <li>
//         <Button
//           fill
//           icon={isImportLocation ? 'import' : IconSet.FOLDER_CLOSE}
//           rightIcon={dir.isBroken ? <Icon icon={IconSet.WARNING} /> : null}
//           className={'tooltip'}
//           data-right={`${dir.isBroken ? 'Cannot find this location: ' : ''} ${dir.path}`}
//         >
//           <span className="ellipsis">{Path.basename(dir.path)}</span>
//         </Button>
//       </li>
//     );
//   }

//   public renderContextMenu() {
//     const isImportLocation = this.props.dir.id === DEFAULT_LOCATION_ID;

//     return (
//       <Menu>
//         <MenuItem text="Configure" onClick={this.openConfigDialog} icon={IconSet.SETTINGS} />
//         <MenuItem onClick={this.handleAddToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
//         <MenuItem onClick={this.handleReplaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
//         <MenuItem onClick={this.handleOpenFileExplorer} text="Open in File Browser" icon={IconSet.FOLDER_CLOSE} />
//         <MenuItem text="Delete" onClick={this.handleDelete} icon={IconSet.DELETE} disabled={isImportLocation} />
//       </Menu>
//     );
//   }
// }

interface ILocationConfigModalProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationConfigModal = ({ dir, handleClose }: ILocationConfigModalProps) => {
  if (!dir) return <> </>;
  return (
    <Dialog
      title={<span className="ellipsis" title={dir.path}>Location: {Path.basename(dir.path)}</span>}
      icon={IconSet.FOLDER_CLOSE}
      isOpen={Boolean(dir)}
      onClose={handleClose}
      className={Classes.DARK}
    >
      <div className={Classes.DIALOG_BODY}>
        <Observer>
          { () =>
            <>
              <span>Path: <pre>{dir.path}</pre></span>
              {/* <Checkbox label="Recursive" checked /> */}
              {/* <Checkbox label="Add folder name as tag" /> */}
              <Label>
                Tags to add
                <MultiTagSelector
                  selectedItems={dir.clientTagsToAdd}
                  onTagSelect={dir.addTag}
                  onTagDeselect={dir.removeTag}
                  onClearSelection={dir.clearTags}
                />
              </Label>
            </>
          }
        </Observer>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose}>{dir.isInitialized ? 'Close' : 'Confirm'}</Button>
        </div>
      </div>
    </Dialog>
  );
};

interface ILocationRemovalAlertProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationRemovalAlert = ({ dir, handleClose }: ILocationRemovalAlertProps) => {
  const { locationStore } = useContext(StoreContext);
  const handleRemove = useCallback(() => {
    if (dir) {
      locationStore.removeDirectory(dir.id);
      handleClose();
    }
  }, [dir, handleClose, locationStore]);

  if (!dir) return <> </>;

  return (
    <Alert
      isOpen={Boolean(dir)}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      icon={IconSet.DELETE}
      intent="danger"
      onCancel={handleClose}
      onConfirm={handleRemove}
      canEscapeKeyCancel
      canOutsideClickCancel
      className={Classes.DARK}
    >
      <div className="bp3-dark" id="deleteFile">
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Remove {`"${Path.basename(dir.path)}"`} from your locations?
          <br />
          This will remove all files it contains from Allusion.
        </p>
      </div>
    </Alert>
  );
};

function dirItemAsTreeNode (dirItem: IDirectoryTreeItem): ITreeNode<string> {
  return {
    id: dirItem.fullPath,
    label: dirItem.name,
    nodeData: dirItem.fullPath,
    childNodes: dirItem.children.length === 0
      ? [{ id: `${dirItem.fullPath}-empty`, label: <i>No subfolders</i> }]
      : dirItem.children.map(dirItemAsTreeNode),
    hasCaret: true,
  }
}

const LocationsTree = ({ onDelete, onConfig }: ILocationTreeProps) => {
  const { locationStore, uiStore } = useContext(StoreContext);
  const [nodes, setNodes] = useState<ITreeNode<string>[]>(
    locationStore.locationList.map((location) => ({
      id: location.id,
      label: Path.basename(location.path),
      nodeData: location.path,
      icon: location.id === DEFAULT_LOCATION_ID ? 'import' : IconSet.FOLDER_CLOSE,
      rightIcon: location.isBroken ? <Icon icon={IconSet.WARNING} /> : 'tag',
      className: 'tooltip',
      'data-right': `${location.isBroken ? 'Cannot find this location: ' : ''} ${location.path}`,
    })
  ));

  useEffect(() => {
    locationStore.locationList.forEach(
      (loc, locIndex) => loc.getDirectoryTree()
        .then((children) =>
          setNodes((nodes) => {
            const newNodes = [...nodes];
            newNodes[locIndex].childNodes = children.map(dirItemAsTreeNode);
            return newNodes;
          }),
        ),
      )
  }, [locationStore.locationList]);

  const addToSearch = useCallback((path: string) => {
    uiStore.addSearchCriteria(new ClientStringSearchCriteria<IFile>('path', path, 'contains'));
    uiStore.searchByQuery();
    uiStore.openSearch();
  }, [uiStore]);

  const replaceSearch = useCallback((path: string) => {
    uiStore.replaceSearchCriteriaList(new ClientStringSearchCriteria<IFile>('path', path, 'contains'));
    uiStore.searchByQuery();
    uiStore.openSearch();
  }, [uiStore]);

  const handleNodeClick = useCallback(
    (node: ITreeNode<string>, _path: number[], e: React.MouseEvent) => {
      if (node.nodeData) {
        // TODO: Mark searched nodes as selected?
        e.ctrlKey ? addToSearch(node.nodeData || '') : replaceSearch(node.nodeData || '');
      }
    },
    [addToSearch, replaceSearch]);

  const handleNodeExpand = useCallback((node: ITreeNode<string>) => {
    node.isExpanded = true;
    setNodes([...nodes]);
  }, [nodes]);

  const handleNodeCollapse = useCallback((node: ITreeNode<string>) => {
    node.isExpanded = false;
    setNodes([...nodes]);
  }, [nodes]);

  const handleNodeContextMenu = useCallback(
    (node: ITreeNode<string>, _: number[],
      e: React.MouseEvent<HTMLElement>,
    ) => {
      // The empty folder markers have path (nodeData) specified -no need for context menu
      if (node.nodeData) {
        ContextMenu.show(
          <LocationTreeContextMenu
            path={node.nodeData || ''}
            locationStore={locationStore}
            uiStore={uiStore}
            onConfig={onConfig}
            onDelete={onDelete}
          />,
          { left: e.clientX, top: e.clientY }
        );
      }
  }, [locationStore, onConfig, onDelete, uiStore]);

  return (
    <Tree
      contents={nodes}
      onNodeClick={handleNodeClick}
      onNodeExpand={handleNodeExpand}
      onNodeCollapse={handleNodeCollapse}
      onNodeContextMenu={handleNodeContextMenu}
    />
  );
}

const LocationsForm = () => {
  const { locationStore } = useContext(StoreContext);

  const [locationConfigOpen, setLocationConfigOpen] = useState<ClientLocation | undefined>(undefined);
  const closeConfig = useCallback(() => {
    if (locationConfigOpen !== undefined && !locationConfigOpen.isInitialized) {
      // Import files after config modal is closed, if not already initialized
      locationStore.initializeLocation(locationConfigOpen);
    }
    setLocationConfigOpen(undefined);
  }, [locationConfigOpen, locationStore]);

  const [locationRemoverOpen, setLocationRemoverOpen] = useState<ClientLocation | undefined>(undefined);
  const closeLocationRemover = useCallback(() => {
    setLocationRemoverOpen(undefined);
    // Initialize the location in case it was newly added
    if (locationConfigOpen && !locationConfigOpen.isInitialized) {
      locationStore.initializeLocation(locationConfigOpen);
    }
  }, [locationConfigOpen, locationStore]);

  const [locationTreeKey, setLocationTreeKey] = useState(new Date());
  const handleRefresh = useCallback(() => setLocationTreeKey(new Date()), []);

  const [isCollapsed, setCollapsed] = useState(false);
  const handleChooseWatchedDir = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // multi-selection is disabled which means there can be at most 1 folder
    if (!dirs || dirs.length === 0) {
      return;
    }
    const newLocPath = dirs[0];

    // Check if the new location is a sub-directory of an existing location
    const parentDir = locationStore.locationList.find((dir) => newLocPath.includes(dir.path));
    if (parentDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a sub-folder of an existing location.',
        intent: 'danger',
      });
      return;
    }

    // Check if the new location is a parent-directory of an existing location
    const childDir = locationStore.locationList.find((dir) => dir.path.includes(newLocPath));
    if (childDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a parent-folder of an existing location.',
        intent: 'danger',
      });
      return;
    }

    // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost

    const newLoc = await locationStore.addDirectory({ path: newLocPath, tagsToAdd: [] });
    setLocationConfigOpen(newLoc);
    handleRefresh();
  }, [handleRefresh, locationStore]);

  const toggleLocations = useCallback(
    () => setCollapsed(!isCollapsed),
    [isCollapsed, setCollapsed]);

  return (
   <div>
      <div className="outliner-header-wrapper" onClick={toggleLocations}>
        <H4 className="bp3-heading">
          <Icon icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}/>
          Locations
        </H4>
        <Button
          minimal
          icon={IconSet.FOLDER_CLOSE_ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
          data-right={Tooltip.Location}
        />
        <Button
          minimal
          icon={IconSet.RELOAD}
          onClick={handleRefresh}
          className="tooltip"
          data-right={Tooltip.Refresh}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        {/* <ul id="watched-folders">
          {
            locationStore.locationList.map((dir, i) => (
              <LocationListItem
                key={`${dir.path}-${i}`}
                dir={dir}
                onDelete={() => setLocationRemoverOpen(dir)}
                onConfig={() => setLocationConfigOpen(dir)}
                addToSearch={addToSearch}
                replaceSearch={replaceSearch}
              />
            ))
          }
        </ul> */}
        <LocationsTree
          key={locationTreeKey.toString()}
          onDelete={setLocationRemoverOpen}
          onConfig={setLocationConfigOpen}
        />
      </Collapse>

      <LocationConfigModal dir={locationConfigOpen} handleClose={closeConfig} />
      <LocationRemovalAlert dir={locationRemoverOpen} handleClose={closeLocationRemover} />
    </div>
  );
};

export default observer(LocationsForm);